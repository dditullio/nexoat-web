import type { Prisma, User } from '@prisma/client'
import { audienceToApi } from './audience.util'
import { hasAccess, truncateContent } from './scope.util'

/** Include compartido: todo lo que necesitan tanto el mapper público como el admin. */
export const ARTICLE_INCLUDE = {
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
  author: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ArticleInclude

export type ArticleWithRelations = Prisma.ArticleGetPayload<{ include: typeof ARTICLE_INCLUDE }>

/** Forma pública resumida — coincide con `Article` en frontend/src/types/index.ts. */
export function toPublicArticleSummary(article: ArticleWithRelations) {
  return {
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle ?? '',
    date: (article.publishedAt ?? article.createdAt).toISOString(),
    categories: article.categories.map((c) => c.category.slug),
    audience: audienceToApi(article.audience),
    level: article.level,
    scope: article.scope,
    excerpt: article.excerpt ?? '',
    keywords: article.tags.map((t) => t.tag.name),
    coverImage: article.coverImage ?? undefined,
    readingTimeMinutes: article.readingTime ?? undefined,
  }
}

/** Forma pública completa — coincide con `ArticleFull` en frontend/src/types/index.ts. */
export function toPublicArticleFull(article: ArticleWithRelations) {
  return {
    ...toPublicArticleSummary(article),
    content: article.content,
    sources: (article.sources as ArticleSourceShape[] | null) ?? [],
  }
}

/**
 * Forma pública completa para un `viewer` concreto (o `undefined` = anónimo).
 * Si no tiene acceso al `scope` del artículo, devuelve el contenido
 * recortado (`isTruncated: true`) en vez del completo — el contenido pleno
 * no debe salir nunca en el body HTTP si no corresponde, ver
 * docs/features/reader-accounts-and-paywall.md.
 */
export function toPublicArticleFullFor(article: ArticleWithRelations, viewer?: User) {
  if (hasAccess(article.scope, viewer)) {
    return { ...toPublicArticleFull(article), isTruncated: false as const }
  }
  return {
    ...toPublicArticleSummary(article),
    content: truncateContent(article.content),
    sources: [],
    isTruncated: true as const,
    requiredScope: article.scope,
  }
}

/** Forma admin — suma campos de gestión que el blog público no necesita ver. */
export function toAdminArticle(article: ArticleWithRelations) {
  return {
    id: article.id,
    ...toPublicArticleFull(article),
    coverImagePublicId: article.coverImagePublicId ?? undefined,
    status: article.status,
    categorySlugs: article.categories.map((c) => c.category.slug),
    authorId: article.authorId,
    authorName: article.author?.name ?? article.author?.email ?? null,
    publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
    importMetadata: (article.importMetadata as Record<string, unknown> | null) ?? null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  }
}

export interface ArticleSourceShape {
  title: string
  url: string
  description?: string
}
