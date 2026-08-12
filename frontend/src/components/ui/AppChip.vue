<template>
  <span class="chip" :class="[`chip--${variant ?? 'neutral'}`, `chip--${size ?? 'md'}`]">
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
    | 'scope-restricted'
    | 'neutral'
  size?: 'sm' | 'md'
}>()
</script>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-full);
  font-weight: 700;
  letter-spacing: 0.015em;
  white-space: nowrap;
  line-height: 1.4;
}

.chip--md {
  font-size: 0.75rem;
  padding: 0.32rem 0.85rem;
}

.chip--sm {
  font-size: 0.68rem;
  padding: 0.2rem 0.6rem;
}

.chip--neutral {
  background: var(--color-surface-sunken);
  color: var(--color-ink-muted);
}

.chip--category {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.chip--level-basico {
  background: var(--color-level-basico-bg);
  color: var(--color-level-basico-text);
}

.chip--level-intermedio {
  background: var(--color-level-intermedio-bg);
  color: var(--color-level-intermedio-text);
}

.chip--level-avanzado {
  background: var(--color-level-avanzado-bg);
  color: var(--color-level-avanzado-text);
}

.chip--audience-cuidadores {
  background: var(--color-aud-cuidadores-bg);
  color: var(--color-aud-cuidadores-text);
}

.chip--audience-profesionales {
  background: var(--color-aud-profesionales-bg);
  color: var(--color-aud-profesionales-text);
}

.chip--scope-restricted {
  background: var(--color-ochre-soft);
  color: var(--color-ink-secondary);
}
</style>
