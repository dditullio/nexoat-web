<template>
  <RouterLink :to="`/categoria/${category.slug}`" class="cat">
    <span
      class="cat__glyph"
      :style="{ background: category.bg, color: category.accent }"
      aria-hidden="true"
    >
      {{ category.icon }}
    </span>
    <span class="cat__name">{{ category.name }}</span>
    <span class="cat__count">{{ category.articleCount }} artículos</span>
  </RouterLink>
</template>

<script setup lang="ts">
import type { Category } from '@/types'
defineProps<{ category: Category }>()
</script>

<style scoped>
.cat {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-lg);
  padding: 26px 16px 20px;
  color: inherit;
  transition:
    transform 0.4s var(--ease-out-soft),
    box-shadow 0.4s var(--ease-out-soft),
    border-color 0.3s ease;
}

.cat:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-light);
}

/* Arco: el glifo repite el motivo de la portada de artículo */
.cat__glyph {
  width: 54px;
  height: 54px;
  border-radius: 999px 999px 16px 16px / 30px 30px 16px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  flex-shrink: 0;
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 60,
    'WONK' 1;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  transition: transform 0.4s var(--ease-out-soft);
}

.cat:hover .cat__glyph {
  transform: scale(1.08) rotate(-3deg);
}

.cat__name {
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 60,
    'WONK' 1;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  transition: color 0.25s ease;
}

.cat:hover .cat__name {
  color: var(--color-primary-dark);
}

.cat__count {
  font-size: 0.72rem;
  color: var(--color-ink-faint);
  font-weight: 600;
}
</style>
