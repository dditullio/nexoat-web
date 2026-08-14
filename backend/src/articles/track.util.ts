import { ContentTrack } from '@prisma/client'

/**
 * Mismo problema/solución que audience.util.ts: el identificador Prisma no
 * admite guiones, así que `ContentTrack.acompanamiento_terapeutico` es
 * literalmente el string "acompanamiento_terapeutico" en runtime. El tipo
 * `ContentTrack` del frontend (frontend/src/types/index.ts) usa guion, la
 * traducción vive acá, en el borde de ArticlesModule.
 */
export const TRACK_API_VALUES = [
  'acompanamiento-terapeutico',
  'cuidado-de-mayores',
  'recursos-profesionales-at',
] as const
export type TrackApiValue = (typeof TRACK_API_VALUES)[number]

const TO_API: Record<ContentTrack, TrackApiValue> = {
  [ContentTrack.acompanamiento_terapeutico]: 'acompanamiento-terapeutico',
  [ContentTrack.cuidado_de_mayores]: 'cuidado-de-mayores',
  [ContentTrack.recursos_profesionales_at]: 'recursos-profesionales-at',
}

const FROM_API: Record<TrackApiValue, ContentTrack> = {
  'acompanamiento-terapeutico': ContentTrack.acompanamiento_terapeutico,
  'cuidado-de-mayores': ContentTrack.cuidado_de_mayores,
  'recursos-profesionales-at': ContentTrack.recursos_profesionales_at,
}

export function trackToApi(values: ContentTrack[]): TrackApiValue[] {
  return values.map((v) => TO_API[v])
}

export function trackFromApi(values: TrackApiValue[]): ContentTrack[] {
  return values.map((v) => FROM_API[v])
}

/**
 * Mapeo categoría → eje temático (ver docs/features/content-tracks.md,
 * sección "Mapeo categoría → eje", confirmado con el usuario). Vive una
 * sola vez acá — a diferencia de CATEGORY_SEED (seed.ts / stores/blog.ts),
 * que se duplica porque el frontend lo necesita para el fallback estático,
 * este mapeo solo lo usan operaciones de servidor (auto-sugerencia al crear
 * un artículo y el script de backfill único).
 *
 * Las categorías que no aparecen acá son intencionalmente "sin eje
 * prioritario" (aplican a más de un público por igual, ej. "Familia y
 * Vínculos") — no aportan track por sí solas.
 */
const CATEGORY_TRACK_MAP: Record<string, ContentTrack> = {
  'acompanamiento-terapeutico': ContentTrack.acompanamiento_terapeutico,
  'neurodiversidad-y-discapacidad': ContentTrack.acompanamiento_terapeutico,
  'salud-mental': ContentTrack.acompanamiento_terapeutico,
  'autismo-y-tea': ContentTrack.acompanamiento_terapeutico,
  'discapacidad-intelectual-y-psicosocial': ContentTrack.acompanamiento_terapeutico,

  'guia-cuidador': ContentTrack.cuidado_de_mayores,
  'patologias-en-la-vejez': ContentTrack.cuidado_de_mayores,
  'maltrato-y-abuso': ContentTrack.cuidado_de_mayores,
  'aspectos-legales-y-derechos': ContentTrack.cuidado_de_mayores,
  'herramientas-practicas': ContentTrack.cuidado_de_mayores,

  'redaccion-clinica-y-objetivos': ContentTrack.recursos_profesionales_at,
  'encuadre-honorarios-y-facturacion': ContentTrack.recursos_profesionales_at,
  'organizacion-y-salud-ocupacional': ContentTrack.recursos_profesionales_at,
  'recursos-y-materiales-de-trabajo': ContentTrack.recursos_profesionales_at,
  'equipo-familias-y-capacitacion': ContentTrack.recursos_profesionales_at,
}

/** Unión (sin duplicados) de los ejes de las categorías dadas — puede devolver []. */
export function suggestTracksFromCategories(categorySlugs: string[]): ContentTrack[] {
  const tracks = new Set<ContentTrack>()
  for (const slug of categorySlugs) {
    const track = CATEGORY_TRACK_MAP[slug]
    if (track) tracks.add(track)
  }
  return [...tracks]
}
