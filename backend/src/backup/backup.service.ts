import { createReadStream } from 'node:fs'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve, sep } from 'node:path'
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
// `import * as` y no default: jszip es CommonJS (`export = JSZip`) y el
// tsconfig no tiene esModuleInterop — un default import compila a
// `jszip_1.default`, que es undefined en runtime. Misma forma que bcryptjs.
import * as JSZip from 'jszip'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import {
  BACKUP_FORMAT_VERSION,
  BACKUP_TABLES,
  type BackupDelegate,
  type BackupMetadata,
  type BackupSummary,
  type BackupTable,
  hydrateRow,
  serializeRow,
} from './backup.tables'

/** Tope de la subida de un zip para restaurar (el de imágenes son 5MB, ver media.service). */
export const MAX_BACKUP_UPLOAD_BYTES = 50 * 1024 * 1024

const METADATA_ENTRY = 'metadata.json'
const DATA_DIR = 'data'
/** Solo nombres "planos" de zip — cierra cualquier salto de directorio. */
const FILENAME_PATTERN = /^[A-Za-z0-9._-]+\.zip$/

export interface BackupActor {
  id: string
  email: string
  name: string | null
}

export interface RestoreResult {
  filename: string
  counts: Record<string, number>
  safetyBackup: string
  source: BackupMetadata['source']
  backupCreatedAt: string
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name)
  /** `process.cwd()` es `backend/` — los scripts de pnpm corren en el paquete. */
  private readonly dir = process.env.BACKUP_DIR
    ? resolve(process.env.BACKUP_DIR)
    : resolve(process.cwd(), 'storage', 'backups')

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  // ─── Crear ────────────────────────────────────────────────────────────────

  async create(
    actor: BackupActor | null,
    comment: string | null,
    kind: BackupMetadata['kind'] = 'manual'
  ): Promise<BackupSummary> {
    const zip = new JSZip()
    const data = zip.folder(DATA_DIR)!
    const counts: Record<string, number> = {}

    for (const table of BACKUP_TABLES) {
      const rows = await this.delegate(this.prisma, table).findMany()
      counts[table.name] = rows.length
      data.file(
        `${table.name}.jsonl`,
        rows.map((row) => JSON.stringify(serializeRow(table, row))).join('\n')
      )
    }

    const createdAt = new Date()
    const metadata: BackupMetadata = {
      formatVersion: BACKUP_FORMAT_VERSION,
      createdAt: createdAt.toISOString(),
      kind,
      comment: comment?.trim() || null,
      createdBy: {
        id: actor?.id ?? null,
        email: actor?.email ?? null,
        name: actor?.name ?? null,
      },
      source: {
        environment: process.env.NODE_ENV ?? 'development',
        database: this.databaseName(),
      },
      counts,
    }
    zip.file(METADATA_ENTRY, JSON.stringify(metadata, null, 2))

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    await mkdir(this.dir, { recursive: true })
    const filename = await this.uniqueFilename(createdAt, kind)
    await writeFile(join(this.dir, filename), buffer)

    this.logger.log(`Respaldo creado: ${filename} (${buffer.length} bytes)`)

    if (actor) {
      await this.audit.record({
        actorId: actor.id,
        action: 'backup.create',
        entityType: 'Backup',
        entityId: filename,
        metadata: { kind, comment: metadata.comment, counts },
      })
    }

    return { filename, sizeBytes: buffer.length, metadata }
  }

  // ─── Listar / descargar ───────────────────────────────────────────────────

  /** Más nuevo primero. Un zip ilegible se saltea con un warning en vez de romper la lista. */
  async list(): Promise<BackupSummary[]> {
    await mkdir(this.dir, { recursive: true })
    const entries = await readdir(this.dir)
    const summaries: BackupSummary[] = []

    for (const filename of entries) {
      if (!FILENAME_PATTERN.test(filename)) continue
      try {
        const path = join(this.dir, filename)
        const [buffer, stats] = await Promise.all([readFile(path), stat(path)])
        const { metadata } = await this.openZip(buffer)
        summaries.push({ filename, sizeBytes: stats.size, metadata })
      } catch (error) {
        this.logger.warn(`No se pudo leer el respaldo ${filename}: ${String(error)}`)
      }
    }

    return summaries.sort((a, b) => b.metadata.createdAt.localeCompare(a.metadata.createdAt))
  }

  /** Stream + nombre para la descarga; valida que el archivo exista y esté dentro de la carpeta. */
  async openForDownload(filename: string) {
    const path = await this.resolveExisting(filename)
    return createReadStream(path)
  }

  // ─── Restaurar ────────────────────────────────────────────────────────────

  async restoreFromStored(filename: string, actor: BackupActor): Promise<RestoreResult> {
    const path = await this.resolveExisting(filename)
    return this.restore(await readFile(path), filename, actor)
  }

  async restoreFromUpload(
    buffer: Buffer,
    filename: string,
    actor: BackupActor
  ): Promise<RestoreResult> {
    return this.restore(buffer, filename, actor)
  }

  private async restore(
    buffer: Buffer,
    filename: string,
    actor: BackupActor
  ): Promise<RestoreResult> {
    // Se valida TODO el zip antes de abrir la transacción: un archivo
    // corrupto o ajeno tiene que fallar sin haber borrado ni una fila.
    const { metadata, rowsByTable } = await this.parseBackup(buffer)

    // Red de seguridad: si la restauración resultó ser un error, el estado
    // previo queda en la lista a un clic de distancia.
    const safety = await this.create(
      actor,
      `Copia automática previa a restaurar «${filename}»`,
      'pre-restore'
    )

    const counts: Record<string, number> = {}

    await this.prisma.$transaction(
      async (tx) => {
        for (const table of [...BACKUP_TABLES].reverse()) {
          await this.delegate(tx, table).deleteMany()
        }
        for (const table of BACKUP_TABLES) {
          const rows = rowsByTable[table.name]
          counts[table.name] = rows.length
          if (rows.length) {
            await this.delegate(tx, table).createMany({
              data: rows.map((row) => hydrateRow(table, row)),
            })
          }
        }
      },
      // El default de Prisma son 5s — insuficiente para borrar e insertar
      // el contenido completo del sitio.
      { timeout: 120_000, maxWait: 15_000 }
    )

    this.logger.log(`Restauración completa desde ${filename}`)

    // Después de la transacción, si no la propia restauración borraría este
    // registro. El actor puede no existir en la DB restaurada: en ese caso
    // el log queda sin actorId (la FK fallaría) y guarda su email.
    const actorExists = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { id: true },
    })
    await this.audit.record({
      actorId: actorExists ? actor.id : null,
      action: 'backup.restore',
      entityType: 'Backup',
      entityId: filename,
      metadata: {
        counts,
        safetyBackup: safety.filename,
        actorEmail: actor.email,
        source: metadata.source,
        backupCreatedAt: metadata.createdAt,
      },
    })

    return {
      filename,
      counts,
      safetyBackup: safety.filename,
      source: metadata.source,
      backupCreatedAt: metadata.createdAt,
    }
  }

  // ─── Lectura y validación del zip ─────────────────────────────────────────

  private async openZip(buffer: Buffer): Promise<{ zip: JSZip; metadata: BackupMetadata }> {
    let zip: JSZip
    try {
      zip = await JSZip.loadAsync(buffer)
    } catch {
      throw new BadRequestException('El archivo no es un .zip válido')
    }

    const entry = zip.file(METADATA_ENTRY)
    if (!entry) {
      throw new BadRequestException(`El zip no contiene ${METADATA_ENTRY} — no es un respaldo`)
    }

    let metadata: BackupMetadata
    try {
      metadata = JSON.parse(await entry.async('string')) as BackupMetadata
    } catch {
      throw new BadRequestException(`El ${METADATA_ENTRY} del respaldo no es un JSON válido`)
    }

    if (metadata.formatVersion > BACKUP_FORMAT_VERSION) {
      throw new BadRequestException(
        `El respaldo usa el formato v${metadata.formatVersion} y esta versión del sitio entiende hasta la v${BACKUP_FORMAT_VERSION}`
      )
    }

    return { zip, metadata }
  }

  /** Valida el zip completo y devuelve las filas ya parseadas por tabla. */
  async parseBackup(buffer: Buffer): Promise<{
    metadata: BackupMetadata
    rowsByTable: Record<string, Record<string, unknown>[]>
  }> {
    const { zip, metadata } = await this.openZip(buffer)
    const rowsByTable: Record<string, Record<string, unknown>[]> = {}

    for (const table of BACKUP_TABLES) {
      const entry = zip.file(`${DATA_DIR}/${table.name}.jsonl`)
      if (!entry) {
        throw new BadRequestException(
          `Al respaldo le falta ${DATA_DIR}/${table.name}.jsonl — está incompleto`
        )
      }
      rowsByTable[table.name] = this.parseJsonl(await entry.async('string'), table)
    }

    return { metadata, rowsByTable }
  }

  private parseJsonl(content: string, table: BackupTable): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        throw new BadRequestException(`${table.name}.jsonl: la línea ${i + 1} no es un JSON válido`)
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new BadRequestException(`${table.name}.jsonl: la línea ${i + 1} no es un objeto`)
      }
      rows.push(parsed as Record<string, unknown>)
    }

    return rows
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Recorrer los delegates genéricamente exige aflojar el tipo acá: cada
   * uno tiene su propio `data`, incompatible entre sí. El registro de
   * `BACKUP_TABLES` garantiza que los nombres existan.
   */
  private delegate(client: object, table: BackupTable): BackupDelegate {
    return (client as Record<string, unknown>)[table.delegate as string] as BackupDelegate
  }

  /**
   * El nombre tiene resolución de segundos: dos respaldos disparados dentro
   * del mismo segundo (ej. el automático previo a restaurar y uno manual)
   * colisionarían y el segundo pisaría al primero — de ahí el contador.
   */
  private async uniqueFilename(date: Date, kind: BackupMetadata['kind']) {
    const pad = (n: number) => String(n).padStart(2, '0')
    const stamp =
      `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
      `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    const suffix = kind === 'pre-restore' ? '-previo-restauracion' : ''

    for (let n = 1; ; n++) {
      const filename = `nexoat-backup-${stamp}${n > 1 ? `-${n}` : ''}${suffix}.zip`
      try {
        await stat(join(this.dir, filename))
      } catch {
        return filename
      }
    }
  }

  /** Defensa en profundidad: patrón del nombre + la ruta resuelta tiene que caer dentro de `dir`. */
  private async resolveExisting(filename: string) {
    if (!FILENAME_PATTERN.test(filename)) {
      throw new BadRequestException('Nombre de respaldo inválido')
    }
    const path = resolve(this.dir, filename)
    if (!isAbsolute(path) || !path.startsWith(this.dir + sep)) {
      throw new BadRequestException('Nombre de respaldo inválido')
    }
    try {
      await stat(path)
    } catch {
      throw new NotFoundException('Ese respaldo no existe')
    }
    return path
  }

  /** Solo el NOMBRE de la base, nunca host/usuario/contraseña de DATABASE_URL. */
  private databaseName(): string | null {
    const url = process.env.DATABASE_URL
    if (!url) return null
    try {
      return new URL(url).pathname.replace(/^\//, '') || null
    } catch {
      return null
    }
  }
}
