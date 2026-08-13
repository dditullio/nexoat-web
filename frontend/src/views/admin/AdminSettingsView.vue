<template>
  <div class="settings">
    <section class="settings__card">
      <h2 class="settings__title">Visibilidad de artículos por nivel</h2>
      <p class="settings__lead">
        Los artículos de alcance <strong>público</strong> siempre se muestran en el sitio. Para los
        artículos de suscripción (nivel 1, 2 y 3) podés elegir cuáles se muestran ya mismo y cuáles
        quedan ocultos hasta que el sistema de suscripciones pagas esté listo. Un nivel apagado no
        aparece en los listados ni se puede abrir directamente — no muestra una versión recortada,
        directamente no existe para el público.
      </p>

      <p v-if="errorMessage" class="settings__banner settings__banner--error" role="alert">
        {{ errorMessage }}
      </p>
      <p v-if="successMessage" class="settings__banner settings__banner--ok" role="status">
        {{ successMessage }}
      </p>

      <div v-if="isLoading" class="settings__loading">Cargando…</div>

      <ul v-else class="settings__levels">
        <li v-for="level in LEVELS" :key="level.scope" class="settings__level">
          <label class="settings__switch">
            <input
              type="checkbox"
              :checked="selected.has(level.scope)"
              :disabled="isSaving"
              @change="toggle(level.scope)"
            />
            <span class="settings__switch-track"><span class="settings__switch-thumb" /></span>
          </label>
          <div class="settings__level-copy">
            <span class="settings__level-name">{{ level.label }}</span>
            <span class="settings__level-desc">{{ level.description }}</span>
          </div>
        </li>
      </ul>

      <button
        type="button"
        class="btn btn--primary"
        :disabled="isSaving || isLoading || !isDirty"
        @click="onSave"
      >
        {{ isSaving ? 'Guardando…' : 'Guardar cambios' }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getSiteSettings, updateVisibleArticleScopes } from '@/services/admin/settings.api'
import { ApiError } from '@/services/http'
import type { ArticleScope } from '@/types'

type ToggleableScope = Exclude<ArticleScope, 'publico'>

const LEVELS: { scope: ToggleableScope; label: string; description: string }[] = [
  {
    scope: 'suscriptores_nivel_1',
    label: 'Nivel 1',
    description: 'Acceso incluido en cualquier cuenta registrada (nivel gratuito).',
  },
  {
    scope: 'suscriptores_nivel_2',
    label: 'Nivel 2',
    description: 'Pensado para una suscripción paga intermedia.',
  },
  {
    scope: 'suscriptores_nivel_3',
    label: 'Nivel 3',
    description: 'Pensado para la suscripción paga más alta.',
  },
]

const isLoading = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const selected = ref<Set<ToggleableScope>>(new Set())
const savedScopes = ref<Set<ToggleableScope>>(new Set())

const isDirty = computed(() => {
  if (selected.value.size !== savedScopes.value.size) return true
  for (const scope of selected.value) {
    if (!savedScopes.value.has(scope)) return true
  }
  return false
})

function toggle(scope: ToggleableScope) {
  const next = new Set(selected.value)
  if (next.has(scope)) next.delete(scope)
  else next.add(scope)
  selected.value = next
}

async function load() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const settings = await getSiteSettings()
    savedScopes.value = new Set(settings.visibleArticleScopes)
    selected.value = new Set(settings.visibleArticleScopes)
  } catch {
    errorMessage.value = 'No pudimos cargar la configuración.'
  } finally {
    isLoading.value = false
  }
}

async function onSave() {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const updated = await updateVisibleArticleScopes(Array.from(selected.value))
    savedScopes.value = new Set(updated.visibleArticleScopes)
    selected.value = new Set(updated.visibleArticleScopes)
    successMessage.value = 'Configuración guardada.'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'No pudimos guardar los cambios.'
  } finally {
    isSaving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.settings__card {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  padding: 28px 32px;
  max-width: 62ch;
}

.settings__title {
  font-size: 1.05rem;
  margin: 0 0 10px;
}

.settings__lead {
  color: var(--color-ink-secondary);
  line-height: 1.7;
  font-size: 0.92rem;
  margin-bottom: 22px;
}

.settings__banner {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.6;
  border-radius: var(--radius-md);
  padding: 11px 15px;
  margin-bottom: 16px;
}

.settings__banner--error {
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
}

.settings__banner--ok {
  color: var(--color-primary-dark);
  background: var(--color-primary-soft);
}

.settings__loading {
  color: var(--color-ink-faint);
  font-style: italic;
  padding: 12px 0;
}

.settings__levels {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 24px;
}

.settings__level {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 4px;
  border-bottom: 1px solid var(--color-line-faint);
}

.settings__level:last-child {
  border-bottom: none;
}

.settings__level-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings__level-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--color-ink);
}

.settings__level-desc {
  font-size: 0.8rem;
  color: var(--color-ink-muted);
}

/* ── Switch ── */
.settings__switch {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 24px;
}

.settings__switch input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}

.settings__switch-track {
  position: absolute;
  inset: 0;
  background: var(--color-line);
  border-radius: var(--radius-full);
  transition: background 0.16s ease;
}

.settings__switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform 0.16s ease;
}

.settings__switch input:checked ~ .settings__switch-track {
  background: var(--color-primary);
}

.settings__switch input:checked ~ .settings__switch-track .settings__switch-thumb {
  transform: translateX(16px);
}

.settings__switch input:disabled ~ .settings__switch-track {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
