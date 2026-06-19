export type Audience = 'cuidadores-familiares' | 'profesionales' | 'mixto'
export type Level = 'basico' | 'intermedio' | 'avanzado'

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
}

export interface Article {
  slug: string
  title: string
  subtitle: string
  date: string
  categories: CategorySlug[]
  audience: Audience[]
  level: Level
  excerpt: string
  keywords: string[]
  coverImage?: string
  readingTimeMinutes?: number
}

export interface ArticleFull extends Article {
  content: string
}

export interface FilterState {
  category: CategorySlug | null
  audience: Audience | null
  level: Level | null
  query: string
}
