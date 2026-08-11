<template>
  <button
    class="tgl"
    :aria-label="store.isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
    :aria-pressed="store.isDark"
    @click="store.toggle()"
  >
    <span class="tgl__slot">
      <Transition name="swap" mode="out-in">
        <svg
          v-if="store.isDark"
          key="sun"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path
            d="M12 2v2.2M12 19.8V22M4.22 4.22l1.56 1.56M18.22 18.22l1.56 1.56M2 12h2.2M19.8 12H22M4.22 19.78l1.56-1.56M18.22 5.78l1.56-1.56"
          />
        </svg>
        <svg
          v-else
          key="moon"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      </Transition>
    </span>
  </button>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'

const store = useThemeStore()
</script>

<style scoped>
.tgl {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-muted);
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.tgl:hover {
  background: var(--color-hover-bg);
  color: var(--color-ink);
}

.tgl__slot {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
}

.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.3s var(--ease-out-soft);
}

.swap-enter-from {
  opacity: 0;
  transform: rotate(-70deg) scale(0.5);
}

.swap-leave-to {
  opacity: 0;
  transform: rotate(70deg) scale(0.5);
}
</style>
