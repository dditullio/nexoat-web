<template>
  <button
    class="theme-toggle"
    :aria-label="store.isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
    @click="store.toggle()"
  >
    <svg
      v-if="store.isDark"
      class="theme-toggle__icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
    <svg
      v-else
      class="theme-toggle__icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'

const store = useThemeStore()
</script>

<style scoped>
.theme-toggle {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-muted);
  background: none;
  transition:
    background 0.15s,
    color 0.15s;
}

.theme-toggle:hover {
  background: var(--color-hover-bg);
  color: var(--color-ink);
}

.theme-toggle__icon {
  transition: transform 0.3s ease;
}

.theme-toggle:hover .theme-toggle__icon {
  transform: rotate(15deg);
}
</style>
