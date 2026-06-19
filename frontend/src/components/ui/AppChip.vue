<template>
  <span class="chip" :class="[`chip--${variant}`, `chip--${size}`]">
    <slot />
  </span>
</template>

<script setup lang="ts">
defineProps<{
  variant?:
    | 'category'
    | 'level-basico'
    | 'level-intermedio'
    | 'level-avanzado'
    | 'audience-cuidadores'
    | 'audience-profesionales'
    | 'neutral'
  size?: 'sm' | 'md'
}>()
</script>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-full);
  font-weight: 600;
  white-space: nowrap;
}

.chip--md {
  font-size: 0.75rem;
  padding: 0.2rem 0.7rem;
}

.chip--sm {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
}

.chip--neutral {
  background: var(--color-bg-section);
  color: var(--color-text-muted);
}

.chip--category {
  background: #e8f0e0;
  color: var(--color-primary);
}

.chip--level-basico {
  background: var(--color-level-basico);
  color: var(--color-level-basico-text);
}

.chip--level-intermedio {
  background: var(--color-level-intermedio);
  color: var(--color-level-intermedio-text);
}

.chip--level-avanzado {
  background: var(--color-level-avanzado);
  color: var(--color-level-avanzado-text);
}

.chip--audience-cuidadores {
  background: var(--color-audience-cuidadores);
  color: var(--color-audience-cuidadores-text);
}

.chip--audience-profesionales {
  background: var(--color-audience-profesionales);
  color: var(--color-audience-profesionales-text);
}
</style>
