import { useHead } from '@unhead/vue'
import type { MaybeRefOrGetter } from 'vue'

// Base para armar URLs absolutas de canonical/og:url/og:image — inlineada
// en build time igual que VITE_API_URL (ver frontend/Dockerfile). En dev
// local, si no está seteada, cae a localhost para no romper nada.
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

// Mismo texto que el fallback estático de index.html — mantenerlos en
// sync si se cambia uno.
const DEFAULT_DESCRIPTION =
  'Guías y recursos con base en evidencia sobre acompañamiento terapéutico y cuidado de personas, para cuidadores familiares y profesionales.'

export interface SeoMetaOptions {
  /** Sin el " — NexoAT" del sufijo, que agrega este composable (salvo `titleIncludesBrand`). */
  title: MaybeRefOrGetter<string>
  /**
   * La Home ya quiere la marca primero en el título (mejor para el
   * resultado de búsqueda del dominio raíz), no al final — con esto en
   * `true`, `title` se usa tal cual, sin el sufijo " — NexoAT".
   */
  titleIncludesBrand?: boolean
  description?: MaybeRefOrGetter<string | undefined>
  /** Path relativo (ej. "/articulo/mi-slug") — se resuelve a absoluto acá. */
  path: MaybeRefOrGetter<string>
  // Sin fallback a una imagen genérica: mientras no exista un asset de
  // marca real (ver docs/features/seo.md), es mejor omitir og:image/
  // twitter:image en las páginas sin imagen propia que apuntar a un
  // archivo que da 404.
  image?: MaybeRefOrGetter<string | undefined>
  type?: MaybeRefOrGetter<'website' | 'article'>
  /** Rutas privadas/transaccionales (admin, mi-cuenta, login, etc.). */
  noindex?: MaybeRefOrGetter<boolean>
}

/**
 * Meta tags dinámicos (title/description/canonical/Open Graph/Twitter Card)
 * por página — ver docs/features/seo.md, Fase 1. Reemplaza el
 * `document.title` genérico que antes fijaba `router.afterEach`.
 */
export function useSeoMeta(options: SeoMetaOptions) {
  useHead({
    title: () =>
      options.titleIncludesBrand ? resolve(options.title) : `${resolve(options.title)} — NexoAT`,
    meta: [
      {
        name: 'description',
        content: () => resolve(options.description) ?? DEFAULT_DESCRIPTION,
      },
      {
        name: 'robots',
        content: () => (resolve(options.noindex) ? 'noindex, nofollow' : 'index, follow'),
      },
      { property: 'og:site_name', content: 'NexoAT' },
      { property: 'og:type', content: () => resolve(options.type) ?? 'website' },
      { property: 'og:title', content: () => resolve(options.title) },
      {
        property: 'og:description',
        content: () => resolve(options.description) ?? DEFAULT_DESCRIPTION,
      },
      { property: 'og:url', content: () => absoluteUrl(resolve(options.path)) },
      { property: 'og:image', content: () => resolve(options.image) },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: () => resolve(options.title) },
      {
        name: 'twitter:description',
        content: () => resolve(options.description) ?? DEFAULT_DESCRIPTION,
      },
      { name: 'twitter:image', content: () => resolve(options.image) },
    ],
    link: [{ rel: 'canonical', href: () => absoluteUrl(resolve(options.path)) }],
  })
}

// Dos firmas: la requerida (ej. `path`, que nunca es undefined) devuelve
// `T` sin más — si solo hubiera una firma genérica, TS infiere `T |
// undefined` para *cualquier* llamada (el parámetro admite `undefined`
// aunque el valor concreto pasado no lo sea), lo que rompía los usos de
// `absoluteUrl()` más abajo (espera `string`, no `string | undefined`).
function resolve<T>(value: MaybeRefOrGetter<T>): T
function resolve<T>(value: MaybeRefOrGetter<T> | undefined): T | undefined
function resolve<T>(value: MaybeRefOrGetter<T> | undefined): T | undefined {
  if (value === undefined) return undefined
  return typeof value === 'function' ? (value as () => T)() : (value as T)
}

function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
