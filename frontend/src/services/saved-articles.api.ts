import { http } from '@/services/http'
import type { PaginatedResult, SavedArticleEntry } from '@/types/reader-library'

export function getSavedArticles(
  page = 1,
  pageSize = 20
): Promise<PaginatedResult<SavedArticleEntry>> {
  return http<PaginatedResult<SavedArticleEntry>>(
    `/me/saved-articles?page=${page}&pageSize=${pageSize}`
  )
}

export function getSavedStatus(slug: string): Promise<{ saved: boolean }> {
  return http<{ saved: boolean }>(`/me/saved-articles/${slug}/status`)
}

export function saveArticle(slug: string): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/me/saved-articles/${slug}`, { method: 'POST' })
}

export function unsaveArticle(slug: string): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/me/saved-articles/${slug}`, { method: 'DELETE' })
}
