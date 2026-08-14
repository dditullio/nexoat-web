import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { CATEGORY_THEMES } from '@/utils/theme'
import { http, toQueryString } from '@/services/http'
import type { Article, Category, CategorySlug, FilterState } from '@/types'
import type { Paginated } from '@/types/admin'

interface CategoryMeta {
  slug: CategorySlug
  name: string
  description: string
  coverImage?: string
}

// Semilla estática: evita que el nav/las tarjetas parpadeen sin nombre de
// categoría mientras fetchCategories() resuelve. La pisa la respuesta real
// de GET /categories apenas llega — hoy trae exactamente estos mismos
// valores (ver backend/prisma/seed.ts, sembrado a partir de esta misma
// lista). El tema visual (bg/accent/gradient/icon) sigue viviendo 100% acá
// en el frontend vía CATEGORY_THEMES, nunca lo devuelve la API.
const CATEGORY_SEED: CategoryMeta[] = [
  {
    slug: 'acompanamiento-terapeutico',
    name: 'Acompañamiento Terapéutico',
    description: 'Qué es el AT, cómo funciona y el rol del acompañante en equipos de salud',
  },
  {
    slug: 'guia-cuidador',
    name: 'Guía del Cuidador',
    description: 'Técnicas prácticas: higiene, movilización, medicación y rutinas de cuidado',
  },
  {
    slug: 'cuidar-al-cuidador',
    name: 'Cuidar al Cuidador',
    description: 'Burnout, autocuidado y límites emocionales del cuidador familiar',
  },
  {
    slug: 'neurodiversidad-y-discapacidad',
    name: 'Neurodiversidad y Discapacidad',
    description: 'TDAH, TEA, discapacidad intelectual y abordaje de conductas disruptivas',
  },
  {
    slug: 'familia-y-vinculos',
    name: 'Familia y Vínculos',
    description: 'Duelo diagnóstico, dinámicas familiares, crianza y relaciones de cuidado',
  },
  {
    slug: 'salud-mental',
    name: 'Salud Mental',
    description: 'Psicosis, trastornos alimentarios, adicciones y conductas autolesivas',
  },
  {
    slug: 'patologias-en-la-vejez',
    name: 'Vejez y Salud',
    description: 'Parkinson, Alzheimer, centros de día y mitos del envejecimiento',
  },
  {
    slug: 'sistema-de-salud-y-recursos',
    name: 'Sistema de Salud',
    description: 'Cómo navegar el sistema sanitario, recursos disponibles y derivaciones',
  },
  {
    slug: 'herramientas-practicas',
    name: 'Herramientas Prácticas',
    description: 'Guías paso a paso, checklists y organizadores de cuidado',
  },
  {
    slug: 'evidencia-en-foco',
    name: 'Evidencia en Foco',
    description: 'Artículos basados en investigación, datos y estudios clínicos',
  },
  {
    slug: 'maltrato-y-abuso',
    name: 'Maltrato y Abuso',
    description: 'Detección, denuncia y abuso económico — cómo reconocerlo y actuar a tiempo',
  },
  {
    slug: 'aspectos-legales-y-derechos',
    name: 'Aspectos Legales y Derechos',
    description: 'Curatela, patrimonio y denuncias — el marco legal del cuidado y la vejez',
  },
  {
    slug: 'historias-que-humanizan',
    name: 'Historias que Humanizan',
    description: 'Relatos testimoniales que ponen rostro y voz a la experiencia del cuidado',
  },
  {
    slug: 'autismo-y-tea',
    name: 'Autismo y TEA',
    description: 'Abordaje, diagnóstico y acompañamiento específico del espectro autista',
  },
  {
    slug: 'discapacidad-intelectual-y-psicosocial',
    name: 'Discapacidad Intelectual y Psicosocial',
    description: 'Capacidad jurídica, apoyos e inclusión más allá del diagnóstico clínico',
  },
  {
    slug: 'redaccion-clinica-y-objetivos',
    name: 'Redacción Clínica y Objetivos',
    description: 'Informes técnicos, formulación de objetivos medibles y registro de campo',
  },
  {
    slug: 'encuadre-honorarios-y-facturacion',
    name: 'Encuadre, Honorarios y Facturación',
    description:
      'Límites con la familia, tarifas, contratos y aspectos administrativos del ejercicio profesional',
  },
  {
    slug: 'organizacion-y-salud-ocupacional',
    name: 'Organización y Salud Ocupacional',
    description: 'Gestión del tiempo, burnout y autocuidado propio del acompañante terapéutico',
  },
  {
    slug: 'recursos-y-materiales-de-trabajo',
    name: 'Recursos y Materiales de Trabajo',
    description:
      'Kit de herramientas, adaptación de espacios y materiales didácticos para la jornada',
  },
  {
    slug: 'equipo-familias-y-capacitacion',
    name: 'Equipo, Familias y Capacitación',
    description:
      'Trabajo interdisciplinario, comunicación con familias/escuela y formación continua',
  },
]

export const useBlogStore = defineStore('blog', () => {
  const articles = ref<Article[]>([])
  const categoriesRaw = ref<CategoryMeta[]>(CATEGORY_SEED)
  const isLoading = ref(false)
  const isLoadingCategories = ref(false)
  const filters = ref<FilterState>({
    category: null,
    audience: null,
    track: null,
    level: null,
    scope: null,
    query: '',
  })

  const categories = computed<Category[]>(() =>
    categoriesRaw.value.map((cat) => ({
      ...cat,
      ...CATEGORY_THEMES[cat.slug],
      articleCount: articles.value.filter((a) => a.categories.includes(cat.slug)).length,
    }))
  )

  const filteredArticles = computed(() =>
    articles.value.filter((article) => {
      if (filters.value.category && !article.categories.includes(filters.value.category))
        return false
      if (filters.value.audience && !article.audience.includes(filters.value.audience)) return false
      if (filters.value.track && !article.tracks.includes(filters.value.track)) return false
      if (filters.value.level && article.level !== filters.value.level) return false
      if (filters.value.scope && article.scope !== filters.value.scope) return false
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
    filters.value = {
      category: null,
      audience: null,
      track: null,
      level: null,
      scope: null,
      query: '',
    }
  }

  function getCategoryBySlug(slug: CategorySlug): Category | undefined {
    return categories.value.find((c) => c.slug === slug)
  }

  /** Trae los artículos publicados. pageSize generoso: las vistas públicas
   * todavía filtran/paginan client-side sobre el array completo, no hay UI
   * de paginación de servidor todavía. */
  async function fetchArticles() {
    isLoading.value = true
    try {
      const res = await http<Paginated<Article>>('/articles' + toQueryString({ pageSize: 100 }))
      articles.value = res.items
    } finally {
      isLoading.value = false
    }
  }

  async function fetchCategories() {
    isLoadingCategories.value = true
    try {
      categoriesRaw.value = await http<CategoryMeta[]>('/categories')
    } catch {
      // Se queda con CATEGORY_SEED si falla — mejor mostrar la última
      // versión conocida que romper toda la navegación por categorías.
    } finally {
      isLoadingCategories.value = false
    }
  }

  return {
    articles,
    isLoading,
    isLoadingCategories,
    filters,
    categories,
    filteredArticles,
    setFilter,
    clearFilters,
    getCategoryBySlug,
    fetchArticles,
    fetchCategories,
  }
})
