import { http, toQueryString } from '@/services/http'
import type { CommentStatus } from '@/types/comments'
import type { Paginated } from '@/types/admin'

export interface AdminCommentAuthor {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

export interface AdminCommentEntry {
  id: string
  body: string
  status: CommentStatus
  likeCount: number
  reportCount: number
  parentId: string | null
  rootId: string | null
  editedAt: string | null
  createdAt: string
  author: AdminCommentAuthor
  article: { slug: string; title: string }
}

export interface AdminCommentsQuery {
  status?: CommentStatus
  reported?: boolean
  q?: string
  articleId?: string
  page?: number
  pageSize?: number
}

export function listAdminComments(
  query: AdminCommentsQuery = {}
): Promise<Paginated<AdminCommentEntry>> {
  return http<Paginated<AdminCommentEntry>>(`/admin/comments${toQueryString(query)}`)
}

export function setCommentStatus(id: string, status: 'visible' | 'oculto'): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/admin/comments/${id}/status`, { method: 'PATCH', body: { status } })
}

export function deleteAdminComment(id: string): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/admin/comments/${id}`, { method: 'DELETE' })
}
