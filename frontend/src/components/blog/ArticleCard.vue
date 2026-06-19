<template>
  <RouterLink :to="`/articulo/${article.slug}`" class="card">
    <!-- Imagen / gradient -->
    <div class="card__img" :style="{ background: theme.gradient }"></div>

    <!-- Cuerpo -->
    <div class="card__body">
      <div class="card__chip" :style="{ background: theme.bg, color: theme.accent }">
        {{ primaryCategoryName }}
      </div>

      <h3 class="card__title">{{ article.title }}</h3>
      <p class="card__excerpt">{{ article.excerpt }}</p>

      <div class="card__meta">
        <span class="card__date">{{ formattedDate }}</span>
        <span class="card__spacer" />
        <span class="card__level-chip" :style="{ background: level.bg, color: level.text }">
          {{ level.label }}
        </span>
        <span
          v-for="aud in article.audience"
          :key="aud"
          class="card__level-chip"
          :style="{ background: audienceChip(aud).bg, color: audienceChip(aud).text }"
          >{{ audienceChip(aud).label }}</span
        >
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCategoryTheme, LEVEL_CHIPS, AUDIENCE_CHIPS } from '@/utils/theme'
import { CATEGORIES } from '@/stores/blog'
import type { Article, Audience } from '@/types'

const props = defineProps<{ article: Article }>()

const theme = computed(() => getCategoryTheme(props.article.categories[0]))

const primaryCategoryName = computed(
  () =>
    CATEGORIES.find((c) => c.slug === props.article.categories[0])?.name ??
    props.article.categories[0]
)

const formattedDate = computed(() =>
  new Date(props.article.date).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
)

const level = computed(() => LEVEL_CHIPS[props.article.level])

function audienceChip(aud: Audience) {
  return AUDIENCE_CHIPS[aud] ?? AUDIENCE_CHIPS['mixto']
}
</script>

<style scoped>
.card {
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  transition:
    box-shadow 0.22s,
    transform 0.22s,
    border-color 0.22s;
}
.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-3px);
  border-color: #ccc8c0;
}

.card__img {
  height: 194px;
  flex-shrink: 0;
}

.card__body {
  padding: 20px 22px 22px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 10px;
}

.card__chip {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  letter-spacing: 0.04em;
}

.card__title {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card__excerpt {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  line-height: 1.66;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 14px;
  border-top: 1px solid var(--color-border-faint);
}

.card__date {
  font-size: 11px;
  color: var(--color-text-faint);
  font-weight: 500;
}

.card__spacer {
  flex: 1;
}

.card__level-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}
</style>
