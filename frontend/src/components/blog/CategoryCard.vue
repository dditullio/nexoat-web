<template>
  <RouterLink
    :to="`/categoria/${category.slug}`"
    class="cat"
    :class="{ 'cat--photo': category.coverImage }"
  >
    <img
      v-if="category.coverImage"
      :src="category.coverImage"
      :alt="category.name"
      class="cat__img"
    />

    <span
      v-if="!category.coverImage"
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
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-lg);
  padding: 26px 16px 20px;
  overflow: hidden;
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

/* Con foto: la imagen cubre la tarjeta, nombre y contador quedan sobre un
   scrim inferior en vez del layout centrado con glifo. */
.cat--photo {
  min-height: 190px;
  justify-content: flex-end;
  border-color: transparent;
}

.cat__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s var(--ease-out-soft);
}

.cat--photo:hover .cat__img {
  transform: scale(1.06);
}

.cat--photo::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(20, 16, 12, 0) 40%, rgba(20, 16, 12, 0.72) 100%);
}

.cat--photo .cat__name,
.cat--photo .cat__count {
  position: relative;
  color: #f7f2e9;
}

.cat--photo:hover .cat__name {
  color: #f7f2e9;
}

.cat--photo .cat__count {
  color: rgba(247, 242, 233, 0.75);
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
