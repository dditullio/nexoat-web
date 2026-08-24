<template>
  <div class="container preferences">
    <p class="eyebrow preferences__eyebrow">Mi cuenta</p>
    <h1 class="preferences__title">Preferencias de correo</h1>
    <p class="preferences__lead">Elegí qué emails opcionales querés recibir de NexoAT.</p>

    <section class="card preferences__card">
      <div class="preferences__row">
        <div class="preferences__info">
          <h2 class="preferences__row-title">Novedades por correo</h2>
          <p class="preferences__row-desc">
            Avisos ocasionales sobre artículos nuevos y novedades del sitio. Es la única categoría
            de correo opcional que existe hoy — el resto de los emails (bienvenida, confirmación de
            cuenta, recuperación de contraseña) son necesarios para el funcionamiento de tu cuenta y
            no se pueden desactivar.
          </p>
        </div>

        <button
          type="button"
          class="preferences__toggle"
          :class="{ 'is-on': subscribed }"
          :disabled="isLoading || isSaving"
          role="switch"
          :aria-checked="subscribed"
          aria-label="Recibir novedades por correo"
          @click="onToggle"
        >
          <span class="preferences__toggle-knob" />
        </button>
      </div>

      <p v-if="errorMessage" class="preferences__error" role="alert">{{ errorMessage }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getNewsletterStatus,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
} from '@/services/me-newsletter.api'

const subscribed = ref(false)
const isLoading = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')

async function load() {
  isLoading.value = true
  try {
    const res = await getNewsletterStatus()
    subscribed.value = res.subscribed
  } finally {
    isLoading.value = false
  }
}

async function onToggle() {
  const next = !subscribed.value
  isSaving.value = true
  errorMessage.value = ''
  try {
    if (next) {
      await subscribeToNewsletter()
    } else {
      await unsubscribeFromNewsletter()
    }
    subscribed.value = next
  } catch {
    errorMessage.value = 'No pudimos guardar el cambio. Probá de nuevo.'
  } finally {
    isSaving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.preferences {
  padding-block: 48px 80px;
  max-width: 720px;
}

.preferences__eyebrow {
  margin-bottom: 8px;
}

.preferences__title {
  font-size: 2rem;
  margin-bottom: 10px;
}

.preferences__lead {
  font-size: 0.95rem;
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 32px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-sm);
}

.preferences__card {
  padding: 28px 32px;
}

.preferences__row {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.preferences__info {
  flex: 1;
  min-width: 0;
}

.preferences__row-title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.preferences__row-desc {
  font-size: 0.86rem;
  line-height: 1.65;
  color: var(--color-ink-secondary);
}

.preferences__toggle {
  flex-shrink: 0;
  width: 46px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--color-line);
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  transition: background 0.2s ease;
  margin-top: 2px;
}

.preferences__toggle.is-on {
  background: var(--color-primary);
  justify-content: flex-end;
}

.preferences__toggle:disabled {
  opacity: 0.6;
  pointer-events: none;
}

.preferences__toggle-knob {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease;
}

.preferences__error {
  margin-top: 18px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}
</style>
