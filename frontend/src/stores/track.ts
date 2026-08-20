import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ContentTrack } from '@/types'

const STORAGE_KEY = 'nexoat-track'

/**
 * Eje temático elegido por la persona que visita el sitio ("¿desde dónde
 * llegás?") — filtro suave y persistente, no un gate: nunca oculta
 * contenido del otro eje, solo lo prioriza/atenúa. Ver
 * docs/features/content-tracks.md.
 *
 * Distinto de `filters.track` en stores/blog.ts, que es el filtro duro y
 * explícito de una vista puntual (categoría/búsqueda) — FilterSidebar.vue
 * sincroniza su valor inicial desde acá, pero limpiarlo en esa vista no
 * toca esta preferencia global.
 */
export const useTrackStore = defineStore('track', () => {
  const activeTrack = ref<ContentTrack | null>(null)

  function setTrack(track: ContentTrack | null) {
    activeTrack.value = track
    if (track) localStorage.setItem(STORAGE_KEY, track)
    else localStorage.removeItem(STORAGE_KEY)
  }

  function init() {
    const stored = localStorage.getItem(STORAGE_KEY)
    activeTrack.value = isContentTrack(stored) ? stored : null
  }

  return { activeTrack, setTrack, init }
})

function isContentTrack(value: string | null): value is ContentTrack {
  return (
    value === 'acompanamiento-terapeutico' ||
    value === 'cuidado-de-mayores' ||
    value === 'recursos-profesionales-at'
  )
}
