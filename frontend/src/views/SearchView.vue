<template>
  <div class="srch">
    <div class="container srch__inner">
      <header class="srch__head">
        <span class="eyebrow">Buscador</span>
        <h1 class="srch__title">¿Qué necesitás encontrar?</h1>
      </header>

      <form class="srch__form" @submit.prevent="doSearch">
        <svg
          class="srch__icon"
          width="19"
          height="19"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="7.5" cy="7.5" r="5" />
          <path d="M11.5 11.5L16 16" />
        </svg>
        <input
          v-model="localQuery"
          type="search"
          placeholder="Tema, condición o palabra clave…"
          class="srch__input"
          aria-label="Buscar artículos"
          autofocus
        />
        <button type="submit" class="srch__go">Buscar</button>
      </form>

      <div class="srch__layout">
        <FilterSidebar class="srch__sidebar" />

        <div class="srch__results">
          <!-- Con texto de búsqueda: la lista sale de searchResults (server-side,
               busca en título/subtítulo/extracto/contenido/tags — ver
               runSearch() en stores/blog.ts). Sin texto pero con algún filtro
               activo (incluido Eje, que antes no filtraba nada): filteredArticles,
               client-side sobre el listado ya cargado completo. -->
          <template v-if="hasAnyFilter">
            <p v-if="isSearchPending" class="srch__count">Buscando…</p>
            <p v-else class="srch__count">
              <strong>{{ results.length }}</strong>
              {{ results.length === 1 ? 'resultado' : 'resultados' }}
              <template v-if="store.filters.query">
                para <em>«{{ store.filters.query }}»</em>
              </template>
            </p>

            <div v-if="!isSearchPending && results.length" class="grid-3">
              <ArticleCard v-for="article in results" :key="article.slug" :article="article" />
            </div>

            <div v-else-if="!isSearchPending" class="empty">
              <h2 class="empty__title">Sin coincidencias</h2>
              <p class="empty__desc">
                No encontramos nada con esos filtros. Probá con otra combinación, una palabra más
                general, o entrá por tema.
              </p>
              <div class="empty__cats">
                <RouterLink
                  v-for="cat in store.categories.slice(0, 6)"
                  :key="cat.slug"
                  :to="`/categoria/${cat.slug}`"
                  class="empty__cat"
                >
                  <span class="empty__cat-dot" :style="{ background: cat.accent }"></span>
                  {{ cat.name }}
                </RouterLink>
              </div>
            </div>
          </template>

          <!-- Estado inicial: sin texto ni filtros -->
          <template v-else>
            <div class="srch__browse">
              <span class="eyebrow">O explorá</span>
              <div class="grid-3">
                <ArticleCard
                  v-for="article in store.articles.slice(0, 6)"
                  :key="article.slug"
                  :article="article"
                />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import ArticleCard from '@/components/blog/ArticleCard.vue'
import FilterSidebar from '@/components/blog/FilterSidebar.vue'

const route = useRoute()
const store = useBlogStore()
const localQuery = ref('')

const hasAnyFilter = computed(
  () =>
    !!store.filters.query ||
    store.filters.audience !== null ||
    store.filters.track !== null ||
    store.filters.level !== null ||
    store.filters.scope !== null
)

// Con texto activo, esperamos a searchResults (server-side); todavía no
// llegó la primera respuesta apenas se tipea → isSearching + resultado null.
const isSearchPending = computed(() => !!store.filters.query && store.isSearching)
const results = computed(() =>
  store.filters.query ? (store.searchResults ?? []) : store.filteredArticles
)

onMounted(() => {
  const q = route.query.q as string
  if (q) {
    localQuery.value = q
    store.setFilter('query', q)
  }
})

function doSearch() {
  store.setFilter('query', localQuery.value.trim())
}
</script>

<style scoped>
.srch {
  padding-block: 56px 96px;
}

.srch__inner {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.srch__head {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.srch__title {
  font-size: clamp(1.9rem, 4vw, 2.9rem);
  font-weight: 600;
  letter-spacing: -0.035em;
}

/* Formulario */
.srch__form {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-full);
  padding: 5px 5px 5px 22px;
  max-width: 640px;
  box-shadow: var(--shadow-md);
  transition:
    border-color 0.25s ease,
    box-shadow 0.3s ease;
}

.srch__form:focus-within {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg);
}

.srch__icon {
  color: var(--color-ink-faint);
  flex-shrink: 0;
}

.srch__input {
  flex: 1;
  border: none;
  background: none;
  padding: 14px 12px;
  font-size: 1rem;
  min-width: 0;
  outline: none;
}

.srch__input::placeholder {
  color: var(--color-ink-faint);
}

.srch__input::-webkit-search-cancel-button {
  cursor: pointer;
}

.srch__go {
  background: var(--color-primary);
  color: #fffdfa;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 12px 26px;
  border-radius: var(--radius-full);
  white-space: nowrap;
  transition: background 0.2s ease;
}

.dark .srch__go {
  color: #191512;
}

.srch__go:hover {
  background: var(--color-primary-dark);
}

/* Layout de 2 columnas: sidebar de facetas + resultados */
.srch__layout {
  display: grid;
  grid-template-columns: 272px 1fr;
  gap: 32px;
  align-items: start;
}

.srch__sidebar {
  position: sticky;
  top: 96px;
  max-height: calc(100vh - 96px - 32px);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--color-line) transparent;
}

.srch__results {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
}

.srch__count {
  font-size: 0.95rem;
  color: var(--color-ink-muted);
}

.srch__count strong {
  color: var(--color-ink);
  font-weight: 700;
}

.srch__count em {
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 60;
  font-style: italic;
  color: var(--color-ink);
}

.srch__browse {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 10px;
}

/* Grilla */
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
}

/* Vacío */
.empty {
  padding: 64px 24px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-2xl);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty__title {
  font-size: 1.4rem;
  font-weight: 600;
}

.empty__desc {
  color: var(--color-ink-muted);
  max-width: 44ch;
  line-height: 1.7;
  margin-bottom: 10px;
}

.empty__cats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.empty__cat {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-full);
  padding: 8px 16px;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.3s var(--ease-out-soft);
}

.empty__cat:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
  transform: translateY(-2px);
}

.empty__cat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .srch__layout {
    grid-template-columns: 1fr;
  }

  .srch__sidebar {
    position: static;
    max-height: none;
    overflow-y: visible;
  }
}

@media (max-width: 640px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }

  .srch__form {
    flex-wrap: wrap;
    border-radius: var(--radius-lg);
    padding: 12px;
  }

  .srch__input {
    width: 100%;
    padding: 8px;
  }

  .srch__go {
    width: 100%;
  }
}
</style>
