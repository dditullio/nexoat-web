<template>
  <div v-if="category" class="cat-page">
    <header class="cat-hero" :class="{ 'cat-hero--photo': category.coverImage }">
      <div
        v-if="category.coverImage"
        class="cat-hero__photo"
        :style="{ backgroundImage: `url(${category.coverImage})` }"
        aria-hidden="true"
      />
      <div
        v-else
        class="cat-hero__wash"
        :style="{ background: category.gradient }"
        aria-hidden="true"
      />

      <div class="container cat-hero__inner">
        <nav class="crumb" aria-label="Ruta de navegación">
          <RouterLink to="/">Inicio</RouterLink>
          <span aria-hidden="true">/</span>
          <span>{{ category.name }}</span>
        </nav>

        <div class="cat-hero__row">
          <span
            v-if="!category.coverImage"
            class="cat-hero__glyph"
            :style="{ background: category.bg, color: category.accent }"
            aria-hidden="true"
          >
            {{ category.icon }}
          </span>

          <div>
            <h1 class="cat-hero__title">{{ category.name }}</h1>
            <p class="cat-hero__desc">{{ category.description }}</p>
            <span class="cat-hero__count">
              {{ categoryArticles.length }}
              {{ categoryArticles.length === 1 ? 'artículo' : 'artículos' }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <div class="container cat-body">
      <FilterBar />

      <div v-if="categoryArticles.length" class="grid-3">
        <ArticleCard v-for="article in categoryArticles" :key="article.slug" :article="article" />
      </div>

      <div v-else class="empty">
        <h2 class="empty__title">Nada por acá todavía</h2>
        <p class="empty__desc">
          No hay artículos en este tema con los filtros que elegiste. Probá quitándolos.
        </p>
        <button class="btn btn--primary" @click="store.clearFilters()">Ver todos</button>
      </div>
    </div>
  </div>

  <div v-else class="container cat-missing">
    <h1 class="section-title">Ese tema no existe</h1>
    <p class="section-lead">Puede que el enlace esté mal escrito o que ya no esté disponible.</p>
    <RouterLink to="/" class="btn btn--primary">Volver al inicio</RouterLink>
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
.cat-hero {
  position: relative;
  overflow: hidden;
  background: var(--color-canvas-alt);
  border-bottom: 1px solid var(--color-line-light);
  padding: 44px 0 48px;
}

.cat-hero__wash {
  position: absolute;
  top: -70%;
  left: 50%;
  width: 900px;
  height: 500px;
  transform: translateX(-50%);
  filter: blur(90px);
  opacity: 0.18;
  pointer-events: none;
}

/* Con foto: la categoría tiene coverImage — banner a página completa en
   vez del blob de color difuso, con scrim para que el texto siga legible. */
.cat-hero--photo {
  border-bottom: none;
  padding: 72px 0 56px;
}

.cat-hero__photo {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  pointer-events: none;
}

.cat-hero--photo::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(20, 16, 12, 0.32) 0%,
    rgba(20, 16, 12, 0.62) 75%,
    rgba(20, 16, 12, 0.72) 100%
  );
}

.cat-hero--photo .crumb,
.cat-hero--photo .crumb a,
.cat-hero--photo .cat-hero__title,
.cat-hero--photo .cat-hero__desc,
.cat-hero--photo .cat-hero__count {
  color: #f7f2e9;
}

.cat-hero--photo .cat-hero__desc {
  color: rgba(247, 242, 233, 0.82);
}

.cat-hero--photo .cat-hero__count {
  color: rgba(247, 242, 233, 0.68);
}

.cat-hero--photo .crumb a:hover {
  color: var(--color-primary-light);
}

.cat-hero__inner {
  position: relative;
  z-index: 1;
}

.crumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-ink-faint);
  margin-bottom: 28px;
}

.crumb a {
  color: var(--color-ink-muted);
  transition: color 0.2s ease;
}

.crumb a:hover {
  color: var(--color-primary-dark);
}

.cat-hero__row {
  display: flex;
  align-items: flex-start;
  gap: 22px;
}

.cat-hero__glyph {
  width: 68px;
  height: 68px;
  flex-shrink: 0;
  border-radius: 999px 999px 18px 18px / 36px 36px 18px 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 60,
    'WONK' 1;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.cat-hero__title {
  font-size: clamp(1.9rem, 4vw, 2.9rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  margin-bottom: 10px;
}

.cat-hero__desc {
  font-size: 1.02rem;
  color: var(--color-ink-secondary);
  line-height: 1.72;
  max-width: 56ch;
  margin-bottom: 12px;
}

.cat-hero__count {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  color: var(--color-ink-faint);
}

/* Cuerpo */
.cat-body {
  padding-block: 36px 96px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
}

.empty {
  text-align: center;
  padding: 72px 24px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-2xl);
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
  max-width: 42ch;
  line-height: 1.7;
  margin-bottom: 8px;
}

.cat-missing {
  padding-block: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
}

@media (max-width: 1024px) {
  .grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }

  .cat-hero__row {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
