export type Audience = 'cuidadores-familiares' | 'profesionales' | 'mixto'
export type Level = 'basico' | 'intermedio' | 'avanzado'
// Clasificación editorial de acceso ("alcance" en la metadata del .md
// importado) — no confundir con roles de administración. Por ahora es solo
// clasificación/filtro, ver docs/features/article-scope-filters.md.
export type ArticleScope =
  | 'publico'
  | 'suscriptores_nivel_1'
  | 'suscriptores_nivel_2'
  | 'suscriptores_nivel_3'

export type CategorySlug =
  | 'acompanamiento-terapeutico'
  | 'guia-cuidador'
  | 'cuidar-al-cuidador'
  | 'neurodiversidad-y-discapacidad'
  | 'familia-y-vinculos'
  | 'salud-mental'
  | 'patologias-en-la-vejez'
  | 'sistema-de-salud-y-recursos'
  | 'herramientas-practicas'
  | 'evidencia-en-foco'
  | 'maltrato-y-abuso'
  | 'aspectos-legales-y-derechos'
  | 'historias-que-humanizan'
  | 'autismo-y-tea'
  | 'discapacidad-intelectual-y-psicosocial'

export interface CategoryTheme {
  bg: string
  accent: string
  gradient: string
  cardColor: string
  icon: string
}

export interface Category extends CategoryTheme {
  slug: CategorySlug
  name: string
  description: string
  articleCount: number
  coverImage?: string
}

export interface Article {
  slug: string
  title: string
  subtitle: string
  date: string
  categories: CategorySlug[]
  audience: Audience[]
  level: Level
  scope: ArticleScope
  excerpt: string
  keywords: string[]
  coverImage?: string
  readingTimeMinutes?: number
}

export interface ArticleSource {
  title: string
  url: string
  description?: string
}

export interface ArticleFull extends Article {
  content: string
  sources: ArticleSource[]
  // `true` cuando el viewer no tiene acceso al `scope` del artículo: el
  // backend ya devolvió `content` recortado, no el completo (ver
  // docs/features/reader-accounts-and-paywall.md). `requiredScope` solo
  // viene presente en ese caso.
  isTruncated: boolean
  requiredScope?: ArticleScope
}

export interface FilterState {
  category: CategorySlug | null
  audience: Audience | null
  level: Level | null
  scope: ArticleScope | null
  query: string
}
