import type { CategorySlug, Level, Audience, ArticleScope, ContentTrack } from '@/types'

/**
 * Paleta por categoría.
 *
 * Los valores son referencias a variables CSS, no hex literales: así los
 * colores de categoría siguen al tema claro/oscuro igual que el resto de
 * la UI. Los hex viven en `assets/styles/main.css`, en `:root` y `.dark`.
 *
 * Toda la familia se mantiene dentro del rango tierra/vegetal para que
 * conviva con la base arena sin competir con ella.
 */
export const CATEGORY_THEMES: Record<
  CategorySlug,
  { bg: string; accent: string; gradient: string; cardColor: string; icon: string }
> = {
  'acompanamiento-terapeutico': {
    bg: 'var(--cat-at-bg)',
    accent: 'var(--cat-at-ink)',
    cardColor: 'var(--cat-at-bg)',
    gradient: 'var(--cat-at-grad)',
    icon: 'AT',
  },
  'guia-cuidador': {
    bg: 'var(--cat-gc-bg)',
    accent: 'var(--cat-gc-ink)',
    cardColor: 'var(--cat-gc-bg)',
    gradient: 'var(--cat-gc-grad)',
    icon: 'GC',
  },
  'cuidar-al-cuidador': {
    bg: 'var(--cat-cc-bg)',
    accent: 'var(--cat-cc-ink)',
    cardColor: 'var(--cat-cc-bg)',
    gradient: 'var(--cat-cc-grad)',
    icon: 'CC',
  },
  'neurodiversidad-y-discapacidad': {
    bg: 'var(--cat-nd-bg)',
    accent: 'var(--cat-nd-ink)',
    cardColor: 'var(--cat-nd-bg)',
    gradient: 'var(--cat-nd-grad)',
    icon: 'ND',
  },
  'familia-y-vinculos': {
    bg: 'var(--cat-fv-bg)',
    accent: 'var(--cat-fv-ink)',
    cardColor: 'var(--cat-fv-bg)',
    gradient: 'var(--cat-fv-grad)',
    icon: 'FV',
  },
  'salud-mental': {
    bg: 'var(--cat-sm-bg)',
    accent: 'var(--cat-sm-ink)',
    cardColor: 'var(--cat-sm-bg)',
    gradient: 'var(--cat-sm-grad)',
    icon: 'SM',
  },
  'patologias-en-la-vejez': {
    bg: 'var(--cat-vs-bg)',
    accent: 'var(--cat-vs-ink)',
    cardColor: 'var(--cat-vs-bg)',
    gradient: 'var(--cat-vs-grad)',
    icon: 'VS',
  },
  'sistema-de-salud-y-recursos': {
    bg: 'var(--cat-ss-bg)',
    accent: 'var(--cat-ss-ink)',
    cardColor: 'var(--cat-ss-bg)',
    gradient: 'var(--cat-ss-grad)',
    icon: 'SS',
  },
  'herramientas-practicas': {
    bg: 'var(--cat-hp-bg)',
    accent: 'var(--cat-hp-ink)',
    cardColor: 'var(--cat-hp-bg)',
    gradient: 'var(--cat-hp-grad)',
    icon: 'HP',
  },
  'evidencia-en-foco': {
    bg: 'var(--cat-ef-bg)',
    accent: 'var(--cat-ef-ink)',
    cardColor: 'var(--cat-ef-bg)',
    gradient: 'var(--cat-ef-grad)',
    icon: 'EF',
  },
  'maltrato-y-abuso': {
    bg: 'var(--cat-ma-bg)',
    accent: 'var(--cat-ma-ink)',
    cardColor: 'var(--cat-ma-bg)',
    gradient: 'var(--cat-ma-grad)',
    icon: 'MA',
  },
  'aspectos-legales-y-derechos': {
    bg: 'var(--cat-al-bg)',
    accent: 'var(--cat-al-ink)',
    cardColor: 'var(--cat-al-bg)',
    gradient: 'var(--cat-al-grad)',
    icon: 'AL',
  },
  'historias-que-humanizan': {
    bg: 'var(--cat-hh-bg)',
    accent: 'var(--cat-hh-ink)',
    cardColor: 'var(--cat-hh-bg)',
    gradient: 'var(--cat-hh-grad)',
    icon: 'HH',
  },
  'autismo-y-tea': {
    bg: 'var(--cat-tea-bg)',
    accent: 'var(--cat-tea-ink)',
    cardColor: 'var(--cat-tea-bg)',
    gradient: 'var(--cat-tea-grad)',
    icon: 'TEA',
  },
  'discapacidad-intelectual-y-psicosocial': {
    bg: 'var(--cat-di-bg)',
    accent: 'var(--cat-di-ink)',
    cardColor: 'var(--cat-di-bg)',
    gradient: 'var(--cat-di-grad)',
    icon: 'DI',
  },
  'redaccion-clinica-y-objetivos': {
    bg: 'var(--cat-rco-bg)',
    accent: 'var(--cat-rco-ink)',
    cardColor: 'var(--cat-rco-bg)',
    gradient: 'var(--cat-rco-grad)',
    icon: 'RCO',
  },
  'encuadre-honorarios-y-facturacion': {
    bg: 'var(--cat-ehf-bg)',
    accent: 'var(--cat-ehf-ink)',
    cardColor: 'var(--cat-ehf-bg)',
    gradient: 'var(--cat-ehf-grad)',
    icon: 'EHF',
  },
  'organizacion-y-salud-ocupacional': {
    bg: 'var(--cat-oso-bg)',
    accent: 'var(--cat-oso-ink)',
    cardColor: 'var(--cat-oso-bg)',
    gradient: 'var(--cat-oso-grad)',
    icon: 'OSO',
  },
  'recursos-y-materiales-de-trabajo': {
    bg: 'var(--cat-rmt-bg)',
    accent: 'var(--cat-rmt-ink)',
    cardColor: 'var(--cat-rmt-bg)',
    gradient: 'var(--cat-rmt-grad)',
    icon: 'RMT',
  },
  'equipo-familias-y-capacitacion': {
    bg: 'var(--cat-efc-bg)',
    accent: 'var(--cat-efc-ink)',
    cardColor: 'var(--cat-efc-bg)',
    gradient: 'var(--cat-efc-grad)',
    icon: 'EFC',
  },
}

export const LEVEL_CHIPS: Record<Level, { bg: string; text: string; label: string }> = {
  basico: {
    bg: 'var(--color-level-basico-bg)',
    text: 'var(--color-level-basico-text)',
    label: 'Básico',
  },
  intermedio: {
    bg: 'var(--color-level-intermedio-bg)',
    text: 'var(--color-level-intermedio-text)',
    label: 'Intermedio',
  },
  avanzado: {
    bg: 'var(--color-level-avanzado-bg)',
    text: 'var(--color-level-avanzado-text)',
    label: 'Avanzado',
  },
}

export const AUDIENCE_CHIPS: Record<Audience, { bg: string; text: string; label: string }> = {
  'cuidadores-familiares': {
    bg: 'var(--color-aud-cuidadores-bg)',
    text: 'var(--color-aud-cuidadores-text)',
    label: 'Familias',
  },
  profesionales: {
    bg: 'var(--color-aud-profesionales-bg)',
    text: 'var(--color-aud-profesionales-text)',
    label: 'Profesionales',
  },
  mixto: {
    bg: 'var(--color-aud-mixto-bg)',
    text: 'var(--color-aud-mixto-text)',
    label: 'Mixto',
  },
}

// "publico" no tiene chip — un artículo sin restricción no necesita
// anunciarlo. Los tres niveles restringidos comparten la familia ocre
// (mismo par bg/texto que ya usa el disclaimer editorial en ArticleView) en
// vez de inventar un color por nivel: hoy es solo clasificación, no hay
// paywall real todavía (ver docs/features/article-scope-filters.md).
export const SCOPE_CHIPS: Partial<
  Record<ArticleScope, { bg: string; text: string; label: string }>
> = {
  suscriptores_nivel_1: {
    bg: 'var(--color-ochre-soft)',
    text: 'var(--color-ink-secondary)',
    label: 'Registrados',
  },
  suscriptores_nivel_2: {
    bg: 'var(--color-ochre-soft)',
    text: 'var(--color-ink-secondary)',
    label: 'Nivel 2',
  },
  suscriptores_nivel_3: {
    bg: 'var(--color-ochre-soft)',
    text: 'var(--color-ink-secondary)',
    label: 'Nivel 3',
  },
}

// Solo 3 valores de alto nivel, no una paleta de 20 categorías — reusa
// tokens de marca en vez de inventar `--cat-*` nuevos.
export const TRACK_CHIPS: Record<ContentTrack, { bg: string; text: string; label: string }> = {
  'acompanamiento-terapeutico': {
    bg: 'var(--color-primary-soft)',
    text: 'var(--color-primary-dark)',
    label: 'Acompañamiento terapéutico',
  },
  'cuidado-de-mayores': {
    bg: 'var(--color-accent-soft)',
    text: 'var(--color-accent-dark)',
    label: 'Cuidado de personas mayores',
  },
  'recursos-profesionales-at': {
    bg: 'var(--color-ochre-soft)',
    text: 'var(--color-ink-secondary)',
    label: 'Recursos para AT',
  },
}

/**
 * Espejo frontend-only de `CATEGORY_TRACK_MAP` (backend/src/articles/
 * track.util.ts) — mapeo categoría→eje ya confirmado con el usuario (ver
 * docs/features/content-tracks.md, "Mapeo categoría → eje"). Se duplica acá
 * a propósito (mismo criterio que `CATEGORY_SEED`) para agrupar el
 * mega-menú "Temas" del header (`AppHeader.vue`).
 *
 * A propósito NO se deriva de `article.tracks` en runtime: es una decisión
 * editorial estable para la navegación, y los `tracks` reales por artículo
 * se solapan mucho entre categorías (ej. casi cualquier categoría tiene
 * algún artículo con "AT") — derivarlo en vivo vació la columna de
 * "Cuidado de personas mayores" y desbordó la de AT. El filtrado real de
 * artículos (`FilterSidebar.vue`, `/buscar`) sigue usando `article.tracks`
 * tal cual — esto es solo para el menú.
 *
 * Las categorías ausentes son intencionalmente "sin eje prioritario" (ej.
 * "Familia y Vínculos", "Cuidar al Cuidador") — caen en "Otros temas".
 */
export const CATEGORY_TRACK_MAP: Partial<Record<CategorySlug, ContentTrack>> = {
  'acompanamiento-terapeutico': 'acompanamiento-terapeutico',
  'neurodiversidad-y-discapacidad': 'acompanamiento-terapeutico',
  'salud-mental': 'acompanamiento-terapeutico',
  'autismo-y-tea': 'acompanamiento-terapeutico',
  'discapacidad-intelectual-y-psicosocial': 'acompanamiento-terapeutico',

  'guia-cuidador': 'cuidado-de-mayores',
  'patologias-en-la-vejez': 'cuidado-de-mayores',
  'maltrato-y-abuso': 'cuidado-de-mayores',
  'aspectos-legales-y-derechos': 'cuidado-de-mayores',
  'herramientas-practicas': 'cuidado-de-mayores',

  'redaccion-clinica-y-objetivos': 'recursos-profesionales-at',
  'encuadre-honorarios-y-facturacion': 'recursos-profesionales-at',
  'organizacion-y-salud-ocupacional': 'recursos-profesionales-at',
  'recursos-y-materiales-de-trabajo': 'recursos-profesionales-at',
  'equipo-familias-y-capacitacion': 'recursos-profesionales-at',
}

export function getCategoryTheme(slug: CategorySlug) {
  return CATEGORY_THEMES[slug] ?? CATEGORY_THEMES['acompanamiento-terapeutico']
}
