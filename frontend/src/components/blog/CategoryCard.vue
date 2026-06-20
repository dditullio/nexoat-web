<template>
  <RouterLink :to="`/categoria/${category.slug}`" class="cat-card">
    <div class="cat-card__icon" :style="{ background: category.bg, color: category.accent }">
      {{ category.icon }}
    </div>
    <span class="cat-card__name">{{ category.name }}</span>
    <span class="cat-card__count">{{ category.articleCount }} artículos</span>
  </RouterLink>
</template>

<script setup lang="ts">
import type { Category } from '@/types'
defineProps<{ category: Category }>()
</script>

<style scoped>
.cat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 28px 18px 22px;
  text-decoration: none;
  color: inherit;
  transition:
    box-shadow 0.22s,
    transform 0.22s;
}
.cat-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-3px);
}

.cat-card__icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  flex-shrink: 0;
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.cat-card__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.35;
  margin-bottom: 6px;
}

.cat-card__count {
  font-size: 11px;
  color: var(--color-text-faint);
  font-weight: 500;
}
</style>
