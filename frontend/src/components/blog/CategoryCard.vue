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

/* Scrim más temprano y más oscuro que antes (arrancaba recién al 40% y
   llegaba solo a 0.72 de opacidad) — con fotos claras (paredes blancas,
   ropa clara) el nombre quedaba comiéndose el fondo aun con el degradado
   original.

   z-index:1 es necesario, no cosmético: ::after es contenido generado, y en
   el orden de pintado se comporta como el último hijo del elemento — con
   .cat__name/.cat__count en position:relative pero sin z-index quedaban
   "empatados" con el pseudo-elemento, y al estar después en el árbol el
   degradado terminaba pintándose ENCIMA del texto en vez de detrás. Por eso
   se veía más oscuro/tapado cuanto más fuerte se hacía el scrim. */
.cat--photo::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(180deg, rgba(20, 16, 12, 0) 20%, rgba(20, 16, 12, 0.88) 100%);
  pointer-events: none;
}

.cat--photo .cat__name,
.cat--photo .cat__count {
  position: relative;
  z-index: 2;
  color: #f7f2e9;
  /* Sombra tipo subtítulo de película: una capa ajustada para el contorno
     de la letra + un halo difuso más grande, para que el texto se separe
     de la foto incluso en manchas claras que el scrim no tape del todo. */
  text-shadow:
    0 1px 2px rgba(15, 12, 9, 0.85),
    0 2px 10px rgba(15, 12, 9, 0.55);
}

.cat--photo .cat__count {
  color: rgba(247, 242, 233, 0.85);
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

/* :not(.cat--photo) a propósito: antes de este fix había además una regla
   ".cat--photo:hover .cat__name { color: #f7f2e9 }" para que el nombre
   siguiera claro en hover — pero empataba en especificidad con esta (3
   selectores de clase cada una), y como esta quedaba más abajo en el
   archivo, ganaba ella: el nombre se pintaba de verde oscuro sobre la foto
   oscurecida en cada hover (el bug de "Autismo y TEA" ilegible). Con
   :not() ya ni compiten — no depende del orden del archivo. */
.cat:not(.cat--photo):hover .cat__name {
  color: var(--color-primary-dark);
}

.cat__count {
  font-size: 0.72rem;
  color: var(--color-ink-faint);
  font-weight: 600;
}
</style>
