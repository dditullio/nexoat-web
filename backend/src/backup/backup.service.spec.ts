import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { BadRequestException } from '@nestjs/common'
import * as JSZip from 'jszip'
import { BackupService, type BackupActor } from './backup.service'
import { BACKUP_TABLES, hydrateRow, serializeRow } from './backup.tables'
import type { PrismaService } from '../prisma/prisma.service'
import type { AuditService } from '../audit/audit.service'

const ACTOR: BackupActor = { id: 'user-1', email: 'admin@nexoat.test', name: 'Admin' }

/** Prisma falso: cada delegate devuelve las filas que se le carguen acá. */
function fakePrisma(rows: Record<string, Record<string, unknown>[]> = {}) {
  const client: Record<string, unknown> = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: ACTOR.id }) },
  }
  for (const table of BACKUP_TABLES) {
    const existing = (client[table.delegate as string] as object) ?? {}
    client[table.delegate as string] = {
      ...existing,
      findMany: jest.fn().mockResolvedValue(rows[table.name] ?? []),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    }
  }
  return client as unknown as PrismaService
}

const fakeAudit = () =>
  ({ record: jest.fn().mockResolvedValue(undefined) }) as unknown as AuditService

describe('BackupService', () => {
  let dir: string
  let service: BackupService

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nexoat-backups-'))
    process.env.BACKUP_DIR = dir
    process.env.DATABASE_URL = 'postgresql://user:secreto@localhost:5432/nexoat_test'
  })

  afterEach(async () => {
    delete process.env.BACKUP_DIR
    await rm(dir, { recursive: true, force: true })
  })

  describe('serialización de filas', () => {
    const table = BACKUP_TABLES.find((t) => t.name === 'articles')!

    it('escribe las fechas como ISO y las revive como Date', () => {
      const row = { id: 'a1', title: 'Hola', publishedAt: new Date('2026-01-15T10:00:00.000Z') }

      const serialized = serializeRow(table, row)
      expect(serialized.publishedAt).toBe('2026-01-15T10:00:00.000Z')

      const hydrated = hydrateRow(table, JSON.parse(JSON.stringify(serialized)))
      expect(hydrated.publishedAt).toEqual(new Date('2026-01-15T10:00:00.000Z'))
      expect(hydrated.title).toBe('Hola')
    })

    it('omite las claves nulas al rehidratar (Prisma no acepta null en Json nulables)', () => {
      const auditTable = BACKUP_TABLES.find((t) => t.name === 'audit_logs')!
      const hydrated = hydrateRow(auditTable, { id: 'l1', metadata: null, actorId: null })

      expect(hydrated).toEqual({ id: 'l1' })
      expect('metadata' in hydrated).toBe(false)
    })
  })

  describe('create', () => {
    it('escribe un zip con metadata.json y un jsonl por tabla', async () => {
      service = new BackupService(
        fakePrisma({
          categories: [{ id: 'c1', slug: 'salud-mental', createdAt: new Date() }],
          articles: [
            { id: 'a1', title: 'Uno' },
            { id: 'a2', title: 'Dos' },
          ],
        }),
        fakeAudit()
      )

      const summary = await service.create(ACTOR, '  respaldo de prueba  ')

      expect(summary.filename).toMatch(/^nexoat-backup-\d{8}-\d{6}\.zip$/)
      expect(summary.metadata.comment).toBe('respaldo de prueba')
      expect(summary.metadata.kind).toBe('manual')
      expect(summary.metadata.counts.articles).toBe(2)
      expect(summary.metadata.counts.categories).toBe(1)
      expect(summary.metadata.createdBy.email).toBe(ACTOR.email)

      const zip = await JSZip.loadAsync(await readFile(join(dir, summary.filename)))
      expect(zip.file('metadata.json')).toBeTruthy()
      for (const table of BACKUP_TABLES) {
        expect(zip.file(`data/${table.name}.jsonl`)).toBeTruthy()
      }
      const articles = await zip.file('data/articles.jsonl')!.async('string')
      expect(articles.split('\n')).toHaveLength(2)
    })

    it('guarda solo el nombre de la base, nunca las credenciales de DATABASE_URL', async () => {
      service = new BackupService(fakePrisma(), fakeAudit())
      const summary = await service.create(ACTOR, null)

      expect(summary.metadata.source.database).toBe('nexoat_test')
      expect(JSON.stringify(summary.metadata)).not.toContain('secreto')
    })

    it('no pisa un respaldo previo cuando dos caen en el mismo segundo', async () => {
      service = new BackupService(fakePrisma(), fakeAudit())

      const first = await service.create(ACTOR, 'uno')
      const second = await service.create(ACTOR, 'dos')

      expect(second.filename).not.toBe(first.filename)
      expect(await service.list()).toHaveLength(2)
    })

    it('nombra distinto a la copia automática previa a una restauración', async () => {
      service = new BackupService(fakePrisma(), fakeAudit())
      const summary = await service.create(ACTOR, null, 'pre-restore')

      expect(summary.filename).toMatch(/-previo-restauracion\.zip$/)
      expect(summary.metadata.kind).toBe('pre-restore')
    })
  })

  describe('list', () => {
    it('ordena del más nuevo al más viejo e ignora lo que no sea un respaldo', async () => {
      service = new BackupService(fakePrisma(), fakeAudit())
      const first = await service.create(ACTOR, 'viejo')
      const second = await service.create(ACTOR, 'nuevo')
      // Los nombres llevan segundos: si ambos caen en el mismo, el orden es
      // indistinguible — se fuerza una fecha distinta en el más viejo.
      await forceCreatedAt(join(dir, first.filename), '2020-01-01T00:00:00.000Z')
      await writeFile(join(dir, 'notas.txt'), 'esto no es un respaldo')

      const list = await service.list()

      expect(list.map((b) => b.filename)).toEqual([second.filename, first.filename])
      expect(list[0].sizeBytes).toBeGreaterThan(0)
    })
  })

  describe('parseBackup', () => {
    it('acepta un zip generado por el propio servicio', async () => {
      service = new BackupService(
        fakePrisma({ tags: [{ id: 't1', slug: 'duelo', name: 'Duelo' }] }),
        fakeAudit()
      )
      const summary = await service.create(ACTOR, null)

      const { metadata, rowsByTable } = await service.parseBackup(
        await readFile(join(dir, summary.filename))
      )

      expect(metadata.formatVersion).toBe(1)
      expect(rowsByTable.tags).toEqual([{ id: 't1', slug: 'duelo', name: 'Duelo' }])
      expect(rowsByTable.articles).toEqual([])
    })

    it('rechaza algo que no es un zip', async () => {
      service = new BackupService(fakePrisma(), fakeAudit())
      await expect(service.parseBackup(Buffer.from('no soy un zip'))).rejects.toThrow(
        BadRequestException
      )
    })

    it('rechaza un zip sin metadata.json', async () => {
      service = new BackupService(fakePrisma(), fakeAudit())
      const zip = new JSZip()
      zip.file('data/articles.jsonl', '')

      await expect(
        service.parseBackup(await zip.generateAsync({ type: 'nodebuffer' }))
      ).rejects.toThrow(/no es un respaldo/)
    })

    it('rechaza un formato más nuevo que el que entiende esta versión', async () => {
      service = new BackupService(fakePrisma(), fakeAudit())
      const zip = new JSZip()
      zip.file('metadata.json', JSON.stringify({ formatVersion: 99 }))

      await expect(
        service.parseBackup(await zip.generateAsync({ type: 'nodebuffer' }))
      ).rejects.toThrow(/formato v99/)
    })

    it('rechaza un respaldo al que le falta el archivo de una tabla', async () => {
      service = new BackupService(fakePrisma(), fakeAudit())
      const summary = await service.create(ACTOR, null)
      const zip = await JSZip.loadAsync(await readFile(join(dir, summary.filename)))
      zip.remove('data/users.jsonl')

      await expect(
        service.parseBackup(await zip.generateAsync({ type: 'nodebuffer' }))
      ).rejects.toThrow(/users\.jsonl/)
    })

    it('rechaza un jsonl con una línea corrupta indicando cuál es', async () => {
      service = new BackupService(fakePrisma(), fakeAudit())
      const summary = await service.create(ACTOR, null)
      const zip = await JSZip.loadAsync(await readFile(join(dir, summary.filename)))
      zip.file('data/articles.jsonl', '{"id":"a1"}\n{roto')

      await expect(
        service.parseBackup(await zip.generateAsync({ type: 'nodebuffer' }))
      ).rejects.toThrow(/articles\.jsonl: la línea 2/)
    })
  })

  describe('openForDownload', () => {
    beforeEach(() => {
      service = new BackupService(fakePrisma(), fakeAudit())
    })

    it('rechaza un nombre que intenta salir de la carpeta de respaldos', async () => {
      await expect(service.openForDownload('../../.env')).rejects.toThrow(BadRequestException)
      await expect(service.openForDownload('..\\..\\.env.zip')).rejects.toThrow(BadRequestException)
    })

    it('404 si el nombre es válido pero el archivo no existe', async () => {
      await expect(service.openForDownload('nexoat-backup-20200101-000000.zip')).rejects.toThrow(
        /no existe/
      )
    })
  })
})

/** Reescribe el `createdAt` del metadata dentro de un zip ya guardado. */
async function forceCreatedAt(path: string, createdAt: string) {
  const zip = await JSZip.loadAsync(await readFile(path))
  const metadata = JSON.parse(await zip.file('metadata.json')!.async('string'))
  zip.file('metadata.json', JSON.stringify({ ...metadata, createdAt }))
  await writeFile(path, await zip.generateAsync({ type: 'nodebuffer' }))
}
