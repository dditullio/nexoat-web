import { http, toQueryString } from '@/services/http'
import type { Comment, CommentsPage, MyCommentEntry, PaginatedComments } from '@/types/comments'

export function getComments(slug: string, page = 1, pageSize = 10): Promise<CommentsPage> {
  return http<CommentsPage>(`/articles/${slug}/comments${toQueryString({ page, pageSize })}`, {
    skipAuthRetry: true,
  })
}

export function getMoreReplies(rootId: string, skip: number): Promise<Comment[]> {
  return http<Comment[]>(`/comments/${rootId}/replies${toQueryString({ skip })}`, {
    skipAuthRetry: true,
  })
}

export function postComment(slug: string, body: string, parentId?: string): Promise<Comment> {
  return http<Comment>(`/articles/${slug}/comments`, { method: 'POST', body: { body, parentId } })
}

export function updateComment(id: string, body: string): Promise<Comment> {
  return http<Comment>(`/comments/${id}`, { method: 'PATCH', body: { body } })
}

export function deleteComment(id: string): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/comments/${id}`, { method: 'DELETE' })
}

export function likeComment(id: string): Promise<{ likeCount: number }> {
  return http<{ likeCount: number }>(`/comments/${id}/like`, { method: 'POST' })
}

export function unlikeComment(id: string): Promise<{ likeCount: number }> {
  return http<{ likeCount: number }>(`/comments/${id}/like`, { method: 'DELETE' })
}

export function reportComment(id: string, reason?: string): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/comments/${id}/report`, { method: 'POST', body: { reason } })
}

export function getMyComments(page = 1, pageSize = 20): Promise<PaginatedComments<MyCommentEntry>> {
  return http<PaginatedComments<MyCommentEntry>>(`/me/comments${toQueryString({ page, pageSize })}`)
}
