<template>
  <div class="track-switch" role="group" aria-label="Filtrar por eje temático">
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      class="track-switch__btn"
      :class="{ 'is-on': trackStore.activeTrack === opt.value }"
      @click="trackStore.setTrack(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useTrackStore } from '@/stores/track'
import type { ContentTrack } from '@/types'

const trackStore = useTrackStore()

const options: { value: ContentTrack | null; label: string }[] = [
  { value: null, label: 'Ver todo' },
  { value: 'acompanamiento-terapeutico', label: 'Acompañamiento terapéutico' },
  { value: 'cuidado-de-mayores', label: 'Cuidado de personas mayores' },
  { value: 'recursos-profesionales-at', label: 'Recursos para AT' },
]
</script>

<style scoped>
.track-switch {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-full);
  padding: 5px;
  box-shadow: var(--shadow-sm);
}

.track-switch__btn {
  border-radius: var(--radius-full);
  padding: 8px 16px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  white-space: nowrap;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.track-switch__btn:hover {
  background: var(--color-hover-bg);
  color: var(--color-ink);
}

.track-switch__btn.is-on {
  background: var(--color-primary);
  color: #fffdfa;
}

.dark .track-switch__btn.is-on {
  color: #191512;
}

@media (max-width: 640px) {
  .track-switch {
    width: 100%;
  }

  .track-switch__btn {
    flex: 1 1 auto;
  }
}
</style>
