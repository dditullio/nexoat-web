import type { Audience, ArticleSource, ArticleScope, Level } from './index'

export type ArticleStatus = 'borrador' | 'publicado' | 'archivado'

/** Respuesta de /admin/articles/* — superset de `ArticleFull` con campos de gestión. */
export interface AdminArticle {
  id: string
  slug: string
  title: string
  subtitle: string
  excerpt: string
  content: string
  date: string
  categories: string[]
  categorySlugs: string[]
  audience: Audience[]
  level: Level
  scope: ArticleScope
  keywords: string[]
  coverImage?: string
  coverImagePublicId?: string
  readingTimeMinutes?: number
  sources: ArticleSource[]
  /** Metadata cruda del .md importado (fecha, estado, temas, etc.), si el artículo vino de un import. */
  importMetadata: Record<string, unknown> | null
  status: ArticleStatus
  authorId: string | null
  authorName: string | null
  /** Fecha de publicación real (puede ser null si nunca se publicó) — distinta de `date`, que cae a `createdAt`. */
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Payload de alta/edición — coincide con CreateArticleDto/UpdateArticleDto del backend. */
export interface ArticleFormPayload {
  title: string
  slug?: string
  subtitle?: string
  excerpt?: string
  content: string
  coverImage?: string
  coverImagePublicId?: string
  level: Level
  audience: Audience[]
  status?: ArticleStatus
  scope?: ArticleScope
  categorySlugs: string[]
  tags?: string[]
  readingTime?: number
  /** Fecha de publicación (ej. la "fecha" del .md importado), formato YYYY-MM-DD. */
  publishedAt?: string
  sources?: ArticleSource[]
  importMetadata?: Record<string, unknown>
}

/** Respuesta de /admin/categories — las 15 categorías son un set fijo, solo se edita la imagen. */
export interface AdminCategory {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  coverImage?: string
  coverImagePublicId?: string
}

export interface AdminUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'USER'
  isActive: boolean
  emailVerified: string | null
  createdAt: string
  updatedAt: string
}

export interface AuditLogEntry {
  id: string
  actorId: string | null
  actor: { id: string; email: string; name: string | null } | null
  action: string
  entityType: string | null
  entityId: string | null
  metadata: unknown
  ip: string | null
  createdAt: string
}

export interface NewsletterSubscriber {
  id: string
  email: string
  isActive: boolean
  source: string | null
  subscribedAt: string
  unsubscribedAt: string | null
}

/** Metadata que viaja dentro del zip de un respaldo (ver docs/features/database-backups.md). */
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

export interface RestoreResult {
  filename: string
  counts: Record<string, number>
  /** Respaldo automático del estado previo, por si la restauración fue un error. */
  safetyBackup: string
  source: BackupMetadata['source']
  backupCreatedAt: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
