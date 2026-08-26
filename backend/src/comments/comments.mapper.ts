import type { Comment, Prisma } from '@prisma/client'

export const COMMENT_AUTHOR_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect

export type CommentWithAuthor = Comment & {
  author: { id: string; name: string | null; avatarUrl: string | null }
  likes?: { userId: string }[]
}

/**
 * Forma pública de un comentario — nunca incluye el email del autor (ver
 * docs/features/article-comments.md, decisión 6). `likedByMe` viene de
 * `likes` (solo se incluye el like del viewer actual en la query, ver
 * comments.service.ts) o se fuerza a `false` para un viewer anónimo.
 *
 * `oculto` y `eliminado` se blanquean igual (nunca se expone el body ni el
 * autor de un comentario no `visible`, sea porque lo borró su autor/un
 * moderador o porque un moderador lo ocultó) — `isDeleted` distingue el
 * primer caso para el texto del hueco en el frontend (ver
 * docs/features/article-comments.md).
 */
export function toPublicComment(comment: CommentWithAuthor, viewerId?: string) {
  const isHidden = comment.status !== 'visible'
  const isDeleted = comment.status === 'eliminado'
  return {
    id: comment.id,
    articleId: comment.articleId,
    parentId: comment.parentId,
    rootId: comment.rootId,
    body: isHidden ? '' : comment.body,
    isDeleted,
    isHidden,
    status: comment.status,
    likeCount: comment.likeCount,
    likedByMe: viewerId ? (comment.likes?.length ?? 0) > 0 : false,
    editedAt: comment.editedAt ? comment.editedAt.toISOString() : null,
    createdAt: comment.createdAt.toISOString(),
    author: isHidden
      ? null
      : {
          id: comment.author.id,
          name: comment.author.name ?? 'Alguien de la comunidad',
          avatarUrl: comment.author.avatarUrl,
        },
  }
}

/** Forma admin — sí incluye el email, es el panel de moderación. */
export function toAdminComment(
  comment: CommentWithAuthor & {
    author: { id: string; name: string | null; avatarUrl: string | null; email: string }
    _count?: { reports: number }
    article: { slug: string; title: string }
  }
) {
  return {
    id: comment.id,
    body: comment.body,
    status: comment.status,
    likeCount: comment.likeCount,
    reportCount: comment._count?.reports ?? 0,
    parentId: comment.parentId,
    rootId: comment.rootId,
    editedAt: comment.editedAt ? comment.editedAt.toISOString() : null,
    createdAt: comment.createdAt.toISOString(),
    author: {
      id: comment.author.id,
      name: comment.author.name,
      email: comment.author.email,
      avatarUrl: comment.author.avatarUrl,
    },
    article: { slug: comment.article.slug, title: comment.article.title },
  }
}
