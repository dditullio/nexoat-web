<template>
  <div class="fb">
    <div class="fb__group">
      <span class="fb__label">Para quién</span>
      <button
        v-for="opt in audienceOptions"
        :key="String(opt.value)"
        class="fb__btn"
        :class="{ 'is-on': store.filters.audience === opt.value }"
        @click="store.setFilter('audience', opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <span class="fb__sep" aria-hidden="true"></span>

    <div class="fb__group">
      <span class="fb__label">Nivel</span>
      <button
        v-for="opt in levelOptions"
        :key="String(opt.value)"
        class="fb__btn"
        :class="{ 'is-on': store.filters.level === opt.value }"
        @click="store.setFilter('level', opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <span class="fb__sep" aria-hidden="true"></span>

    <div class="fb__group">
      <span class="fb__label">Alcance</span>
      <button
        v-for="opt in scopeOptions"
        :key="String(opt.value)"
        class="fb__btn"
        :class="{ 'is-on': store.filters.scope === opt.value }"
        @click="store.setFilter('scope', opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <button v-if="hasActiveFilters" class="fb__clear" @click="store.clearFilters">
      Limpiar
      <svg
        width="11"
        height="11"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBlogStore } from '@/stores/blog'
import type { Audience, ArticleScope, Level } from '@/types'

const store = useBlogStore()

const audienceOptions: { value: Audience | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'cuidadores-familiares', label: 'Familias' },
  { value: 'profesionales', label: 'Profesionales' },
]

const levelOptions: { value: Level | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'basico', label: 'Básico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
]

const scopeOptions: { value: ArticleScope | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'publico', label: 'Público' },
  { value: 'suscriptores_nivel_1', label: 'Registrados' },
  { value: 'suscriptores_nivel_2', label: 'Nivel 2' },
  { value: 'suscriptores_nivel_3', label: 'Nivel 3' },
]

const hasActiveFilters = computed(
  () =>
    store.filters.audience !== null || store.filters.level !== null || store.filters.scope !== null
)
</script>

<style scoped>
.fb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
}

.fb__group {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.fb__label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  color: var(--color-ink-faint);
  white-space: nowrap;
  margin-right: 3px;
}

.fb__sep {
  width: 1px;
  height: 20px;
  background: var(--color-line-light);
}

.fb__btn {
  border-radius: var(--radius-full);
  padding: 6px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-ink-secondary);
  white-space: nowrap;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.fb__btn:hover {
  background: var(--color-hover-bg);
  color: var(--color-ink);
}

.fb__btn.is-on {
  background: var(--color-primary);
  color: #fffdfa;
}

.dark .fb__btn.is-on {
  color: #191512;
}

.fb__clear {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-ink-faint);
  transition: color 0.2s ease;
}

.fb__clear:hover {
  color: var(--color-accent-dark);
}

@media (max-width: 700px) {
  .fb {
    border-radius: var(--radius-lg);
    gap: 12px;
  }

  .fb__sep {
    display: none;
  }

  .fb__group {
    width: 100%;
  }

  .fb__clear {
    margin-left: 0;
  }
}
</style>
