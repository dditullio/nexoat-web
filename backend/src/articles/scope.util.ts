import { ArticleScope, Role, SubscriptionTier, type User } from '@prisma/client'

const SCOPE_RANK: Record<ArticleScope, number> = {
  publico: 0,
  suscriptores_nivel_1: 1,
  suscriptores_nivel_2: 2,
  suscriptores_nivel_3: 3,
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  gratuito: 1,
  nivel_2: 2,
  nivel_3: 3,
}

// EDITOR+ siempre ve el contenido completo, sin importar `scope` ni
// `subscriptionTier` — necesitan revisar/editar cualquier artículo.
const BYPASS_ROLES: Role[] = [Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN]

export function rankOfScope(scope: ArticleScope): number {
  return SCOPE_RANK[scope]
}

/** `viewer` es `undefined` para un visitante anónimo. */
export function hasAccess(scope: ArticleScope, viewer?: User): boolean {
  if (scope === 'publico') return true
  if (!viewer) return false
  if (BYPASS_ROLES.includes(viewer.role)) return true
  return TIER_RANK[viewer.subscriptionTier] >= SCOPE_RANK[scope]
}

// Misma convención que WordPress (`<!--more-->`): comentario HTML en su
// propia línea, invisible en cualquier render, confirmado en
// docs/features/article-scope-filters.md.
const CUT_MARKER = '<!--corte-->'

/**
 * Recorta `content` para un viewer sin acceso: hasta el marcador si el
 * artículo lo tiene, o los primeros 3 párrafos como fallback. Se calcula en
 * cada request, no se persiste una copia recortada (ver decisión #4 de
 * docs/features/reader-accounts-and-paywall.md).
 */
export function truncateContent(content: string): string {
  const markerIndex = content.indexOf(CUT_MARKER)
  if (markerIndex !== -1) return content.slice(0, markerIndex).trim()

  const paragraphs = content.split(/\n{2,}/)
  return paragraphs.slice(0, 3).join('\n\n').trim()
}
