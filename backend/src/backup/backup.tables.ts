import type { PrismaService } from '../prisma/prisma.service'

/**
 * Subconjunto de la API de un delegate de Prisma que usa el respaldo. Los
 * delegates están tipados por modelo (cada uno con su propio `data`), así
 * que recorrerlos genéricamente exige aflojar el tipo en un solo lugar —
 * este — en vez de esparcir `any` por el service.
 */
export interface BackupDelegate {
  findMany(args?: { orderBy?: unknown }): Promise<Record<string, unknown>[]>
  createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }>
  deleteMany(): Promise<{ count: number }>
}

export interface BackupTable {
  /** Nombre del archivo dentro de `data/` y clave en `counts` del metadata. */
  name: string
  /** Delegate de Prisma correspondiente. */
  delegate: keyof PrismaService
  /**
   * Campos `DateTime` del modelo. Se listan a mano en vez de detectar
   * fechas por regex al restaurar: un `content` de artículo podría contener
   * algo con forma de fecha ISO y no queremos adivinar.
   */
  dateFields: string[]
}

/**
 * Orden de INSERCIÓN — las tablas hijas van después de sus padres para que
 * las claves foráneas se cumplan sin desactivar restricciones. El borrado
 * previo a una restauración recorre esta lista al revés.
 *
 * `refresh_tokens` queda deliberadamente afuera: es estado de sesión
 * efímero, no contenido. Como su FK a `users` es `onDelete: Cascade`, se
 * borra solo al restaurar (ver docs/features/database-backups.md).
 */
export const BACKUP_TABLES: BackupTable[] = [
  { name: 'categories', delegate: 'category', dateFields: ['createdAt', 'updatedAt'] },
  { name: 'tags', delegate: 'tag', dateFields: [] },
  {
    name: 'users',
    delegate: 'user',
    dateFields: ['emailVerified', 'createdAt', 'updatedAt'],
  },
  {
    name: 'articles',
    delegate: 'article',
    dateFields: ['publishedAt', 'createdAt', 'updatedAt'],
  },
  { name: 'article_categories', delegate: 'articleCategory', dateFields: [] },
  { name: 'article_tags', delegate: 'articleTag', dateFields: [] },
  { name: 'oauth_accounts', delegate: 'oAuthAccount', dateFields: ['createdAt'] },
  { name: 'audit_logs', delegate: 'auditLog', dateFields: ['createdAt'] },
  {
    name: 'newsletter_subscribers',
    delegate: 'newsletterSubscriber',
    dateFields: ['subscribedAt', 'unsubscribedAt'],
  },
]

/** Versión del formato del zip — un archivo de una versión mayor se rechaza. */
export const BACKUP_FORMAT_VERSION = 1

export interface BackupMetadata {
  formatVersion: number
  createdAt: string
  kind: 'manual' | 'pre-restore'
  comment: string | null
  createdBy: { id: string | null; email: string | null; name: string | null }
  source: { environment: string; database: string | null }
  counts: Record<string, number>
}

export interface BackupSummary {
  filename: string
  sizeBytes: number
  metadata: BackupMetadata
}

/**
 * Convierte una fila de Prisma a la forma que se escribe en el `.jsonl`:
 * las fechas pasan a ISO 8601 y el resto queda tal cual (`JSON.stringify`
 * ya resuelve strings, números, booleanos, arrays de enums y Json).
 */
export function serializeRow(table: BackupTable, row: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...row }
  for (const field of table.dateFields) {
    const value = out[field]
    if (value instanceof Date) out[field] = value.toISOString()
  }
  return out
}

/**
 * Inversa de `serializeRow`, lista para `createMany`.
 *
 * Las claves con valor `null` se omiten en vez de pasarse explícitamente:
 * evita el caso especial de Prisma con campos `Json` nulables
 * (`AuditLog.metadata` exige `Prisma.DbNull`, no `null`) y es equivalente
 * porque en el esquema no hay ningún campo nulable con `@default` — omitir
 * una clave nula da exactamente el mismo `null`.
 */
export function hydrateRow(table: BackupTable, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value === null) continue
    out[key] = table.dateFields.includes(key) ? new Date(value as string) : value
  }
  return out
}
