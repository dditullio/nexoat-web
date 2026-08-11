import type { Audience, Level } from './index'

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
  keywords: string[]
  coverImage?: string
  coverImagePublicId?: string
  readingTimeMinutes?: number
  status: ArticleStatus
  authorId: string | null
  authorName: string | null
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
  categorySlugs: string[]
  tags?: string[]
  readingTime?: number
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

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
