<template>
  <div v-if="store.filters.track" class="atn">
    <span class="atn__dot" :style="{ background: chip.text }" aria-hidden="true" />
    <p class="atn__text">
      Priorizando <strong>{{ chip.label }}</strong> — el resto de los temas también aparece, más
      abajo.
    </p>
    <button type="button" class="atn__clear" @click="store.setFilter('track', null)">
      Quitar prioridad
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBlogStore } from '@/stores/blog'
import { TRACK_CHIPS } from '@/utils/theme'

// Aviso visible de que el Eje elegido en el Home (o en el sidebar de esta
// vista) sigue activo acá y está reordenando los resultados — el Eje nunca
// oculta artículos (ver `sortByTrackPriority` en stores/blog.ts), pero sin
// este aviso el reordenamiento pasaba desapercibido: nada explicaba por
// qué la grilla no arrancaba en orden cronológico simple (bug real
// reportado por el propio usuario). Ver docs/features/sidebar-navigation.md.
const store = useBlogStore()

const chip = computed(() => TRACK_CHIPS[store.filters.track!])
</script>

<style scoped>
.atn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 18px;
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-lg);
}

.atn__dot {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: var(--radius-full);
}

.atn__text {
  flex: 1;
  min-width: 0;
  font-size: 0.88rem;
  color: var(--color-ink-secondary);
}

.atn__text strong {
  color: var(--color-ink);
}

.atn__clear {
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-primary-dark);
  background: none;
  border: none;
  padding: 4px 2px;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.atn__clear:hover {
  color: var(--color-primary);
}

@media (max-width: 560px) {
  .atn {
    flex-wrap: wrap;
  }

  .atn__clear {
    margin-left: 19px;
  }
}
</style>
