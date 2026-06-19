<template>
  <div class="filter-bar">
    <div class="filter-bar__group">
      <span class="filter-bar__label">Audiencia:</span>
      <button
        class="filter-bar__btn"
        :class="{ 'filter-bar__btn--active': store.filters.audience === null }"
        @click="store.setFilter('audience', null)"
      >
        Todos
      </button>
      <button
        class="filter-bar__btn"
        :class="{ 'filter-bar__btn--active': store.filters.audience === 'cuidadores-familiares' }"
        @click="store.setFilter('audience', 'cuidadores-familiares')"
      >
        Para familias
      </button>
      <button
        class="filter-bar__btn"
        :class="{ 'filter-bar__btn--active': store.filters.audience === 'profesionales' }"
        @click="store.setFilter('audience', 'profesionales')"
      >
        Para profesionales
      </button>
    </div>

    <div class="filter-bar__group">
      <span class="filter-bar__label">Nivel:</span>
      <button
        class="filter-bar__btn"
        :class="{ 'filter-bar__btn--active': store.filters.level === null }"
        @click="store.setFilter('level', null)"
      >
        Todos
      </button>
      <button
        class="filter-bar__btn filter-bar__btn--basico"
        :class="{ 'filter-bar__btn--active': store.filters.level === 'basico' }"
        @click="store.setFilter('level', 'basico')"
      >
        Básico
      </button>
      <button
        class="filter-bar__btn filter-bar__btn--intermedio"
        :class="{ 'filter-bar__btn--active': store.filters.level === 'intermedio' }"
        @click="store.setFilter('level', 'intermedio')"
      >
        Intermedio
      </button>
      <button
        class="filter-bar__btn filter-bar__btn--avanzado"
        :class="{ 'filter-bar__btn--active': store.filters.level === 'avanzado' }"
        @click="store.setFilter('level', 'avanzado')"
      >
        Avanzado
      </button>
    </div>

    <button v-if="hasActiveFilters" class="filter-bar__clear" @click="store.clearFilters">
      Limpiar filtros ✕
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBlogStore } from '@/stores/blog'

const store = useBlogStore()

const hasActiveFilters = computed(
  () => store.filters.audience !== null || store.filters.level !== null
)
</script>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.filter-bar__group {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.filter-bar__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.filter-bar__btn {
  background: var(--color-bg-section);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  color: var(--color-text);
  white-space: nowrap;
}

.filter-bar__btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-bar__btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-white);
}

.filter-bar__clear {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}

.filter-bar__clear:hover {
  color: var(--color-text);
}
</style>
