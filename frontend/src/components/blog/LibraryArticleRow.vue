<template>
  <div class="lrow">
    <RouterLink
      :to="`/articulo/${article.slug}`"
      class="lrow__cover"
      :style="{ background: theme.gradient }"
    >
      <img
        v-if="article.coverImage"
        :src="article.coverImage"
        :alt="article.title"
        class="lrow__img"
      />
      <span v-else class="lrow__monogram">{{ theme.icon }}</span>
    </RouterLink>

    <div class="lrow__body">
      <RouterLink :to="`/articulo/${article.slug}`" class="lrow__title">{{
        article.title
      }}</RouterLink>
      <p class="lrow__meta">
        {{ primaryCategoryName }}
        <span class="lrow__dot" aria-hidden="true"></span>
        {{ timestampLabel }}
      </p>
    </div>

    <button
      type="button"
      class="lrow__remove"
      :disabled="removing"
      :aria-label="removeLabel"
      :title="removeLabel"
      @click="emit('remove')"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path
          d="M3 4h10M6.5 4V2.7c0-.4.3-.7.7-.7h1.6c.4 0 .7.3.7.7V4M4.5 4l.6 9c0 .6.5 1 1 1h3.8c.5 0 1-.4 1-1l.6-9"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCategoryTheme } from '@/utils/theme'
import { useBlogStore } from '@/stores/blog'
import type { Article } from '@/types'

const props = withDefaults(
  defineProps<{
    article: Article
    timestampLabel: string
    removeLabel?: string
    removing?: boolean
  }>(),
  { removeLabel: 'Quitar', removing: false }
)

const emit = defineEmits<{ remove: [] }>()

const store = useBlogStore()
const theme = computed(() => getCategoryTheme(props.article.categories[0]))
const primaryCategoryName = computed(
  () => store.getCategoryBySlug(props.article.categories[0])?.name ?? props.article.categories[0]
)
</script>

<style scoped>
.lrow {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.lrow:hover {
  border-color: var(--color-primary-light);
  box-shadow: var(--shadow-sm);
}

.lrow__cover {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lrow__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lrow__monogram {
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 60;
  font-size: 1.6rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
}

.lrow__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lrow__title {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lrow__title:hover {
  color: var(--color-primary-dark);
}

.lrow__meta {
  font-size: 0.78rem;
  color: var(--color-ink-faint);
  display: flex;
  align-items: center;
  gap: 7px;
}

.lrow__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-ink-faint);
  flex-shrink: 0;
}

.lrow__remove {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-faint);
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.lrow__remove:hover {
  background: var(--color-accent-soft);
  color: var(--color-accent-dark);
}

.lrow__remove:disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
