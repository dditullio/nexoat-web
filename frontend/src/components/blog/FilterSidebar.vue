<template>
  <aside class="fsb" :class="{ 'is-open': mobileOpen }">
    <button
      type="button"
      class="fsb__toggle"
      :aria-expanded="mobileOpen"
      @click="mobileOpen = !mobileOpen"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M3 5h12M5.5 9h7M8 13h2" />
      </svg>
      Filtros
      <span v-if="activeCount" class="fsb__toggle-badge">{{ activeCount }}</span>
      <svg
        class="fsb__toggle-caret"
        :class="{ 'is-open': mobileOpen }"
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M2 4.5l4 4 4-4" />
      </svg>
    </button>

    <div class="fsb__body">
      <div class="fsb__personas">
        <span class="fsb__label">Empezá por acá</span>
        <button
          v-for="p in personas"
          :key="p.key"
          type="button"
          class="fsb__persona"
          :class="{ 'is-on': p.isActive() }"
          @click="p.apply()"
        >
          <span class="fsb__persona-icon" v-html="p.icon"></span>
          <span class="fsb__persona-copy">
            <strong>{{ p.title }}</strong>
            <small>{{ p.desc }}</small>
          </span>
        </button>
      </div>

      <div v-for="group in groups" :key="group.key" class="fsb__group">
        <span class="fsb__label">{{ group.label }}</span>
        <button
          v-for="opt in group.options"
          :key="String(opt.value)"
          type="button"
          class="fsb__opt"
          :class="{ 'is-on': store.filters[group.key] === opt.value }"
          @click="store.setFilter(group.key, opt.value)"
        >
          <span class="fsb__opt-name">
            <span v-if="opt.dot" class="fsb__opt-dot" :style="{ background: opt.dot }"></span>
            {{ opt.label }}
          </span>
          <span class="fsb__opt-count">{{ countFor(group.key, opt.value) }}</span>
        </button>
      </div>

      <button v-if="hasActiveFilters" class="fsb__clear" @click="store.clearFilters">
        Limpiar todo
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
        </svg>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBlogStore } from '@/stores/blog'
import { useTrackStore } from '@/stores/track'
import type { Article, Audience, ContentTrack, FilterState, Level } from '@/types'

/**
 * Panel vertical de facetas para /buscar y /categoria/:slug — reemplaza la
 * antigua FilterBar horizontal en esas dos vistas (con 170+ artículos, la
 * barra de píldoras no alcanzaba a orientar a quien llega).
 *
 * `articles`: base sobre la que se calculan los contadores de cada opción
 * (faceted count: cada grupo se cuenta contra los OTROS filtros activos,
 * no contra sí mismo). Por defecto es el listado completo del store (o los
 * resultados de búsqueda si hay texto activo) — CategoryView.vue pasa el
 * subconjunto ya acotado a esa categoría.
 */
const props = defineProps<{ articles?: Article[] }>()

const store = useBlogStore()
const trackStore = useTrackStore()
const mobileOpen = ref(false)

// Al entrar a una vista con este panel, el filtro de Eje arranca con la
// preferencia elegida en el TrackSwitch del Home (si había alguna) — pero
// desde acá se puede cambiar/limpiar sin tocar esa preferencia global, ver
// docs/features/content-tracks.md.
onMounted(() => {
  if (store.filters.track === null) store.setFilter('track', trackStore.activeTrack)
})

const baseList = computed<Article[]>(
  () => props.articles ?? (store.filters.query ? (store.searchResults ?? []) : store.articles)
)

/** Coincide con la lógica de `filteredArticles` en stores/blog.ts, pero
 * puede excluir una faceta puntual (para contar sus propias opciones sin
 * que el valor ya elegido en esa misma faceta se autoexcluya del resto). */
function matchesFacets(article: Article, filters: FilterState, exclude?: keyof FilterState) {
  if (exclude !== 'audience' && filters.audience && !article.audience.includes(filters.audience))
    return false
  if (exclude !== 'track' && filters.track && !article.tracks.includes(filters.track)) return false
  if (exclude !== 'level' && filters.level && article.level !== filters.level) return false
  if (exclude !== 'scope' && filters.scope && article.scope !== filters.scope) return false
  return true
}

function countFor(key: keyof FilterState, value: string | null) {
  const scoped = baseList.value.filter((a) => matchesFacets(a, store.filters, key))
  if (value === null) return scoped.length
  return scoped.filter((a) => {
    if (key === 'audience') return a.audience.includes(value as Audience)
    if (key === 'track') return a.tracks.includes(value as ContentTrack)
    if (key === 'level') return a.level === value
    if (key === 'scope') return a.scope === value
    return true
  }).length
}

interface Option {
  value: string | null
  label: string
  dot?: string
}

const groups: {
  key: 'track' | 'audience' | 'level' | 'scope'
  label: string
  options: Option[]
}[] = [
  {
    key: 'track',
    label: 'Eje',
    options: [
      { value: null, label: 'Todos' },
      {
        value: 'acompanamiento-terapeutico',
        label: 'Acompañamiento terapéutico',
        dot: 'var(--color-primary-dark)',
      },
      {
        value: 'cuidado-de-mayores',
        label: 'Cuidado de personas mayores',
        dot: 'var(--color-accent-dark)',
      },
      { value: 'recursos-profesionales-at', label: 'Recursos para AT', dot: 'var(--color-ochre)' },
    ],
  },
  {
    key: 'audience',
    label: 'Para quién',
    options: [
      { value: null, label: 'Todos' },
      {
        value: 'cuidadores-familiares',
        label: 'Familias',
        dot: 'var(--color-aud-cuidadores-text)',
      },
      {
        value: 'profesionales',
        label: 'Profesionales',
        dot: 'var(--color-aud-profesionales-text)',
      },
    ],
  },
  {
    key: 'level',
    label: 'Nivel',
    options: [
      { value: null, label: 'Todos' },
      { value: 'basico', label: 'Básico', dot: 'var(--color-level-basico-text)' },
      { value: 'intermedio', label: 'Intermedio', dot: 'var(--color-level-intermedio-text)' },
      { value: 'avanzado', label: 'Avanzado', dot: 'var(--color-level-avanzado-text)' },
    ],
  },
  {
    key: 'scope',
    label: 'Alcance',
    options: [
      { value: null, label: 'Todos' },
      { value: 'publico', label: 'Público' },
      { value: 'suscriptores_nivel_1', label: 'Registrados' },
      { value: 'suscriptores_nivel_2', label: 'Nivel 2' },
      { value: 'suscriptores_nivel_3', label: 'Nivel 3' },
    ],
  },
]

// Atajos por persona — cada uno pisa una combinación de facetas sensata en
// vez de hacer tocar 2-3 píldoras sueltas para llegar al mismo resultado.
// No incluyen `query` ni `category`: son un punto de partida, no un filtro
// final, y conviven con lo que el visitante ya haya escrito.
const personas: {
  key: string
  title: string
  desc: string
  icon: string
  apply: () => void
  isActive: () => boolean
}[] = [
  {
    key: 'familias',
    title: 'Familias y cuidadores',
    desc: 'Guías para el día a día del cuidado',
    icon: `<svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="7.4" cy="8" r="4.1"/><circle cx="13.2" cy="9.6" r="3.3"/></svg>`,
    apply: () => {
      store.setFilter('audience', 'cuidadores-familiares' as Audience)
      store.setFilter('track', null)
      store.setFilter('level', null)
    },
    isActive: () =>
      store.filters.audience === 'cuidadores-familiares' &&
      !store.filters.track &&
      !store.filters.level,
  },
  {
    key: 'profesionales',
    title: 'Profesionales AT',
    desc: 'Encuadre clínico y práctica profesional',
    icon: `<svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="14" height="9.3" rx="2.4"/><path d="M7.6 7V5.4a1.6 1.6 0 0 1 1.6-1.6h1.6a1.6 1.6 0 0 1 1.6 1.6V7"/></svg>`,
    apply: () => {
      store.setFilter('audience', 'profesionales' as Audience)
      store.setFilter('track', null)
      store.setFilter('level', null)
    },
    isActive: () =>
      store.filters.audience === 'profesionales' && !store.filters.track && !store.filters.level,
  },
  {
    key: 'inicial',
    title: 'Recién llego',
    desc: 'Artículos introductorios, sin tecnicismos',
    icon: `<svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17V10"/><path d="M10 10C10 6.5 7 5 4 5c0 3.6 2.6 6 6 5Z"/><path d="M10 8C10 5 12.5 3.5 16 3.5c0 3.2-2.3 5.5-6 5.3Z"/></svg>`,
    apply: () => {
      store.setFilter('level', 'basico' as Level)
      store.setFilter('audience', null)
      store.setFilter('track', null)
    },
    isActive: () =>
      store.filters.level === 'basico' && !store.filters.audience && !store.filters.track,
  },
]

const hasActiveFilters = computed(
  () =>
    store.filters.track !== null ||
    store.filters.audience !== null ||
    store.filters.level !== null ||
    store.filters.scope !== null
)

const activeCount = computed(
  () =>
    [store.filters.track, store.filters.audience, store.filters.level, store.filters.scope].filter(
      (v) => v !== null
    ).length
)
</script>

<style scoped>
.fsb {
  display: flex;
  flex-direction: column;
}

.fsb__toggle {
  display: none;
}

.fsb__body {
  display: flex;
  flex-direction: column;
  gap: 26px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  padding: 22px 20px;
  box-shadow: var(--shadow-sm);
}

.fsb__label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  color: var(--color-ink-faint);
  margin-bottom: 10px;
}

/* Personas */
.fsb__personas {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.fsb__persona {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 11px 12px;
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  text-align: left;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.fsb__persona:hover {
  background: var(--color-hover-bg);
}

.fsb__persona.is-on {
  background: var(--color-primary-tint);
  border-color: var(--color-primary-soft);
}

.fsb__persona-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px 999px 9px 9px / 18px 18px 9px 9px;
  background: var(--color-canvas-alt);
  color: var(--color-primary-dark);
}

.fsb__persona.is-on .fsb__persona-icon {
  background: var(--color-surface);
  color: var(--color-primary-dark);
}

.fsb__persona-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
}

.fsb__persona-copy strong {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--color-ink);
  line-height: 1.3;
}

.fsb__persona-copy small {
  font-size: 0.74rem;
  color: var(--color-ink-muted);
  line-height: 1.4;
}

/* Grupos de facetas */
.fsb__group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fsb__opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.fsb__opt:hover {
  background: var(--color-hover-bg);
  color: var(--color-ink);
}

.fsb__opt.is-on {
  background: var(--color-primary);
  color: #fffdfa;
}

.dark .fsb__opt.is-on {
  color: #191512;
}

.fsb__opt-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.fsb__opt-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.fsb__opt-count {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-ink-faint);
  flex-shrink: 0;
}

.fsb__opt.is-on .fsb__opt-count {
  color: rgba(255, 253, 250, 0.75);
}

.dark .fsb__opt.is-on .fsb__opt-count {
  color: rgba(25, 21, 18, 0.6);
}

/* Limpiar */
.fsb__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-ink-faint);
  padding: 8px 10px;
  border-radius: var(--radius-md);
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.fsb__clear:hover {
  background: var(--color-hover-bg);
  color: var(--color-accent-dark);
}

/* Mobile: colapsa a un acordeón con botón "Filtros" */
@media (max-width: 900px) {
  .fsb__toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    align-self: flex-start;
    background: var(--color-surface);
    border: 1px solid var(--color-line-light);
    border-radius: var(--radius-full);
    padding: 10px 16px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-ink-secondary);
    box-shadow: var(--shadow-sm);
    margin-bottom: 14px;
  }

  .fsb__toggle-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: var(--radius-full);
    background: var(--color-primary);
    color: #fffdfa;
    font-size: 0.68rem;
  }

  .dark .fsb__toggle-badge {
    color: #191512;
  }

  .fsb__toggle-caret {
    transition: transform 0.3s var(--ease-out-soft);
  }

  .fsb__toggle-caret.is-open {
    transform: rotate(180deg);
  }

  .fsb__body {
    display: none;
  }

  .fsb.is-open .fsb__body {
    display: flex;
    margin-bottom: 14px;
  }
}
</style>
