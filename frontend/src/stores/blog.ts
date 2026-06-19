import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { CATEGORY_THEMES } from '@/utils/theme'
import type { Article, Category, CategorySlug, FilterState } from '@/types'

export const CATEGORIES: Category[] = [
  {
    slug: 'acompanamiento-terapeutico',
    name: 'Acompañamiento Terapéutico',
    description: 'Qué es el AT, cómo funciona y el rol del acompañante en equipos de salud',
    articleCount: 0,
    ...CATEGORY_THEMES['acompanamiento-terapeutico'],
  },
  {
    slug: 'guia-cuidador',
    name: 'Guía del Cuidador',
    description: 'Técnicas prácticas: higiene, movilización, medicación y rutinas de cuidado',
    articleCount: 0,
    ...CATEGORY_THEMES['guia-cuidador'],
  },
  {
    slug: 'cuidar-al-cuidador',
    name: 'Cuidar al Cuidador',
    description: 'Burnout, autocuidado y límites emocionales del cuidador familiar',
    articleCount: 0,
    ...CATEGORY_THEMES['cuidar-al-cuidador'],
  },
  {
    slug: 'neurodiversidad-y-discapacidad',
    name: 'Neurodiversidad y Discapacidad',
    description: 'TDAH, TEA, discapacidad intelectual y abordaje de conductas disruptivas',
    articleCount: 0,
    ...CATEGORY_THEMES['neurodiversidad-y-discapacidad'],
  },
  {
    slug: 'familia-y-vinculos',
    name: 'Familia y Vínculos',
    description: 'Duelo diagnóstico, dinámicas familiares, crianza y relaciones de cuidado',
    articleCount: 0,
    ...CATEGORY_THEMES['familia-y-vinculos'],
  },
  {
    slug: 'salud-mental',
    name: 'Salud Mental',
    description: 'Psicosis, trastornos alimentarios, adicciones y conductas autolesivas',
    articleCount: 0,
    ...CATEGORY_THEMES['salud-mental'],
  },
  {
    slug: 'patologias-en-la-vejez',
    name: 'Vejez y Salud',
    description: 'Parkinson, Alzheimer, centros de día y mitos del envejecimiento',
    articleCount: 0,
    ...CATEGORY_THEMES['patologias-en-la-vejez'],
  },
  {
    slug: 'sistema-de-salud-y-recursos',
    name: 'Sistema de Salud',
    description: 'Cómo navegar el sistema sanitario, recursos disponibles y derivaciones',
    articleCount: 0,
    ...CATEGORY_THEMES['sistema-de-salud-y-recursos'],
  },
  {
    slug: 'herramientas-practicas',
    name: 'Herramientas Prácticas',
    description: 'Guías paso a paso, checklists y organizadores de cuidado',
    articleCount: 0,
    ...CATEGORY_THEMES['herramientas-practicas'],
  },
  {
    slug: 'evidencia-en-foco',
    name: 'Evidencia en Foco',
    description: 'Artículos basados en investigación, datos y estudios clínicos',
    articleCount: 0,
    ...CATEGORY_THEMES['evidencia-en-foco'],
  },
]

export const useBlogStore = defineStore('blog', () => {
  const articles = ref<Article[]>([])
  const isLoading = ref(false)
  const filters = ref<FilterState>({ category: null, audience: null, level: null, query: '' })

  const categories = computed<Category[]>(() =>
    CATEGORIES.map((cat) => ({
      ...cat,
      articleCount: articles.value.filter((a) => a.categories.includes(cat.slug)).length,
    }))
  )

  const filteredArticles = computed(() =>
    articles.value.filter((article) => {
      if (filters.value.category && !article.categories.includes(filters.value.category))
        return false
      if (filters.value.audience && !article.audience.includes(filters.value.audience)) return false
      if (filters.value.level && article.level !== filters.value.level) return false
      if (filters.value.query) {
        const q = filters.value.query.toLowerCase()
        return (
          article.title.toLowerCase().includes(q) ||
          article.excerpt.toLowerCase().includes(q) ||
          article.keywords.some((k) => k.toLowerCase().includes(q))
        )
      }
      return true
    })
  )

  function setFilter(key: keyof FilterState, value: string | null) {
    ;(filters.value as Record<string, unknown>)[key] = value
  }

  function clearFilters() {
    filters.value = { category: null, audience: null, level: null, query: '' }
  }

  function getCategoryBySlug(slug: CategorySlug): Category | undefined {
    return categories.value.find((c) => c.slug === slug)
  }

  function loadArticles(data: Article[]) {
    articles.value = data
  }

  return {
    articles,
    isLoading,
    filters,
    categories,
    filteredArticles,
    setFilter,
    clearFilters,
    getCategoryBySlug,
    loadArticles,
  }
})
