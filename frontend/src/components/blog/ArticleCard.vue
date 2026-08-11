<template>
  <RouterLink :to="`/articulo/${article.slug}`" class="card">
    <!-- Portada: arco superior, el motivo estructural del sitio -->
    <div class="card__cover" :style="{ background: theme.gradient }">
      <span class="card__monogram">{{ theme.icon }}</span>
      <span class="card__cat" :style="{ background: theme.bg, color: theme.accent }">
        {{ primaryCategoryName }}
      </span>
    </div>

    <div class="card__body">
      <h3 class="card__title">{{ article.title }}</h3>
      <p class="card__excerpt">{{ article.excerpt }}</p>

      <div class="card__meta">
        <span class="card__date">{{ formattedDate }}</span>
        <span v-if="article.readingTimeMinutes" class="card__dot" aria-hidden="true"></span>
        <span v-if="article.readingTimeMinutes" class="card__date">
          {{ article.readingTimeMinutes }} min
        </span>
        <span class="card__grow"></span>
        <span class="pill" :style="{ background: level.bg, color: level.text }">
          {{ level.label }}
        </span>
        <span
          v-for="aud in article.audience"
          :key="aud"
          class="pill"
          :style="{ background: audienceChip(aud).bg, color: audienceChip(aud).text }"
        >
          {{ audienceChip(aud).label }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCategoryTheme, LEVEL_CHIPS, AUDIENCE_CHIPS } from '@/utils/theme'
import { useBlogStore } from '@/stores/blog'
import type { Article, Audience } from '@/types'

const props = defineProps<{ article: Article }>()
const store = useBlogStore()

const theme = computed(() => getCategoryTheme(props.article.categories[0]))

const primaryCategoryName = computed(
  () => store.getCategoryBySlug(props.article.categories[0])?.name ?? props.article.categories[0]
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
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
  color: inherit;
  transition:
    transform 0.45s var(--ease-out-soft),
    box-shadow 0.45s var(--ease-out-soft),
    border-color 0.3s ease;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-bloom);
  border-color: var(--color-primary-light);
}

/* Portada */
.card__cover {
  position: relative;
  height: 186px;
  flex-shrink: 0;
  margin: 10px 10px 0;
  border-radius: 999px 999px var(--radius-md) var(--radius-md) / 96px 96px var(--radius-md)
    var(--radius-md);
  display: flex;
  align-items: flex-end;
  padding: 16px;
  overflow: hidden;
}

.card__monogram {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 60;
  font-size: 74px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.16);
  letter-spacing: -0.04em;
  user-select: none;
  transition: transform 0.6s var(--ease-out-soft);
}

.card:hover .card__monogram {
  transform: scale(1.1) translateY(-4px);
}

.card__cat {
  position: relative;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-full);
  letter-spacing: 0.02em;
  line-height: 1.4;
}

/* Cuerpo */
.card__body {
  padding: 20px 22px 22px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 10px;
}

.card__title {
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.015em;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.25s ease;
}

.card:hover .card__title {
  color: var(--color-primary-dark);
}

.card__excerpt {
  font-size: 0.9rem;
  color: var(--color-ink-secondary);
  line-height: 1.68;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card__meta {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  padding-top: 15px;
  margin-top: 4px;
  border-top: 1px solid var(--color-line-faint);
}

.card__date {
  font-size: 0.72rem;
  color: var(--color-ink-faint);
  font-weight: 600;
}

.card__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-ink-faint);
  flex-shrink: 0;
}

.card__grow {
  flex: 1;
}

.pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.66rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  white-space: nowrap;
  line-height: 1.4;
}
</style>
