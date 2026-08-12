import { http, toQueryString } from '@/services/http'
import type { AdminArticle, ArticleFormPayload, Paginated } from '@/types/admin'

export interface AdminArticlesQuery {
  status?: string
  category?: string
  scope?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface CategoryOption {
  slug: string
  name: string
  description: string | null
  icon: string | null
}

export function listAdminArticles(query: AdminArticlesQuery = {}) {
  return http<Paginated<AdminArticle>>(`/admin/articles${toQueryString(query)}`)
}

export function getAdminArticle(id: string) {
  return http<AdminArticle>(`/admin/articles/${id}`)
}

export function createArticle(payload: ArticleFormPayload) {
  return http<AdminArticle>('/admin/articles', { method: 'POST', body: payload })
}

export function updateArticle(id: string, payload: Partial<ArticleFormPayload>) {
  return http<AdminArticle>(`/admin/articles/${id}`, { method: 'PATCH', body: payload })
}

export function deleteArticle(id: string) {
  return http<{ ok: true }>(`/admin/articles/${id}`, { method: 'DELETE' })
}

export function listCategoryOptions() {
  return http<CategoryOption[]>('/categories')
}
