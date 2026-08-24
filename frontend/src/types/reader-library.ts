import type { Article } from '@/types'

export interface ReadingHistoryEntry {
  id: string
  readAt: string
  article: Article
}

export interface SavedArticleEntry {
  id: string
  savedAt: string
  article: Article
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
