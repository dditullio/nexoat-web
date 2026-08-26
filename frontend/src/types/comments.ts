export type CommentStatus = 'visible' | 'oculto' | 'eliminado'

export interface CommentAuthor {
  id: string
  name: string
  avatarUrl: string | null
}

export interface Comment {
  id: string
  articleId: string
  parentId: string | null
  rootId: string | null
  body: string
  isDeleted: boolean
  /** `true` para `oculto` y `eliminado` — cuándo el body/autor vienen blanqueados. */
  isHidden: boolean
  status: CommentStatus
  likeCount: number
  likedByMe: boolean
  editedAt: string | null
  createdAt: string
  author: CommentAuthor | null
}

/** Comentario raíz con hasta 3 respuestas embebidas — ver CommentsSection.vue. */
export interface CommentThread extends Comment {
  replies: Comment[]
  replyCount: number
}

export interface CommentsPage {
  items: CommentThread[]
  total: number
  page: number
  pageSize: number
  commentsEnabled: boolean
}

/** "Mis comentarios" — forma resumida, con el artículo enlazado. Ver MyCommentsView.vue. */
export interface MyCommentEntry {
  id: string
  body: string
  likeCount: number
  createdAt: string
  editedAt: string | null
  article: { slug: string; title: string }
}

export interface PaginatedComments<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
