<template>
  <div class="category-page">
    <div v-if="category" class="category-hero">
      <div class="container">
        <nav class="breadcrumb" aria-label="Ruta de navegación">
          <RouterLink to="/">Inicio</RouterLink>
          <span>›</span>
          <span>{{ category.name }}</span>
        </nav>
        <h1 class="category-hero__title">{{ category.name }}</h1>
        <p class="category-hero__desc">{{ category.description }}</p>
        <span class="category-hero__count">{{ categoryArticles.length }} artículos</span>
      </div>
    </div>

    <div class="container">
      <div class="category-page__filters">
        <FilterBar />
      </div>

      <div v-if="categoryArticles.length" class="articles-grid">
        <ArticleCard v-for="article in categoryArticles" :key="article.slug" :article="article" />
      </div>

      <div v-else class="empty-state">
        <p>No hay artículos en esta categoría con los filtros seleccionados.</p>
        <button @click="store.clearFilters()">Ver todos</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import ArticleCard from '@/components/blog/ArticleCard.vue'
import FilterBar from '@/components/blog/FilterBar.vue'
import type { CategorySlug } from '@/types'

const route = useRoute()
const store = useBlogStore()

const slug = computed(() => route.params.slug as CategorySlug)
const category = computed(() => store.getCategoryBySlug(slug.value))

const categoryArticles = computed(() =>
  store.filteredArticles.filter((a) => a.categories.includes(slug.value))
)

watch(slug, () => store.clearFilters(), { immediate: true })
</script>

<style scoped>
.category-hero {
  background: var(--color-bg-section);
  border-bottom: 1px solid var(--color-border);
  padding-block: var(--spacing-2xl);
  margin-bottom: var(--spacing-2xl);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-md);
}

.breadcrumb a {
  color: var(--color-primary);
}

.category-hero__title {
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 800;
  margin-bottom: var(--spacing-sm);
}

.category-hero__desc {
  color: var(--color-text-muted);
  max-width: 540px;
  line-height: 1.6;
  margin-bottom: var(--spacing-md);
}

.category-hero__count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-secondary);
}

.category-page__filters {
  margin-bottom: var(--spacing-xl);
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
  padding-bottom: var(--spacing-3xl);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-3xl);
  color: var(--color-text-muted);
}

.empty-state button {
  margin-top: var(--spacing-md);
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-full);
  padding: 0.5rem 1.5rem;
  cursor: pointer;
  font-family: inherit;
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
}
</style>
