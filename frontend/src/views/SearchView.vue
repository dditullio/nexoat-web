<template>
  <div class="search-page">
    <div class="container">
      <h1 class="search-page__title">Buscar artículos</h1>

      <form class="search-page__form" @submit.prevent="doSearch">
        <input
          v-model="localQuery"
          type="search"
          placeholder="Buscá por tema, condición o palabra clave..."
          class="search-page__input"
          autofocus
        />
        <button type="submit" class="search-page__btn">Buscar</button>
      </form>

      <template v-if="store.filters.query">
        <p class="search-page__results-info">
          <strong>{{ store.filteredArticles.length }}</strong> resultado(s) para "<em>{{
            store.filters.query
          }}</em
          >"
        </p>

        <div v-if="store.filteredArticles.length" class="articles-grid">
          <ArticleCard
            v-for="article in store.filteredArticles"
            :key="article.slug"
            :article="article"
          />
        </div>

        <div v-else class="empty-state">
          <p>No encontramos artículos para esa búsqueda.</p>
          <p>Probá con otros términos o explorá las categorías:</p>
          <div class="empty-state__cats">
            <RouterLink
              v-for="cat in store.categories.slice(0, 5)"
              :key="cat.slug"
              :to="`/categoria/${cat.slug}`"
              class="empty-state__cat-link"
              >{{ cat.name }}</RouterLink
            >
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import ArticleCard from '@/components/blog/ArticleCard.vue'

const route = useRoute()
const store = useBlogStore()
const localQuery = ref('')

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
.search-page {
  padding-block: var(--spacing-3xl);
}

.search-page__title {
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: var(--spacing-xl);
}

.search-page__form {
  display: flex;
  gap: var(--spacing-sm);
  max-width: 600px;
  margin-bottom: var(--spacing-2xl);
}

.search-page__input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.search-page__input:focus {
  border-color: var(--color-primary);
}

.search-page__btn {
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-md);
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.search-page__results-info {
  margin-bottom: var(--spacing-xl);
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
}

.empty-state {
  padding: var(--spacing-3xl) 0;
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.empty-state__cats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.empty-state__cat-link {
  background: var(--color-bg-section);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 0.4rem 1rem;
  font-size: 0.875rem;
  text-decoration: none;
  color: var(--color-primary);
  transition: background 0.15s;
}

.empty-state__cat-link:hover {
  background: var(--color-border);
  text-decoration: none;
}

@media (max-width: 768px) {
  .articles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .articles-grid {
    grid-template-columns: 1fr;
  }
  .search-page__form {
    flex-direction: column;
  }
}
</style>
