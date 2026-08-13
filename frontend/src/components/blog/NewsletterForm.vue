<template>
  <div class="nf__arch" aria-hidden="true">
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M2.5 6.5L12 13l9.5-6.5" />
    </svg>
  </div>

  <h2 class="nf__title">{{ title }}</h2>
  <p class="nf__desc">{{ description }}</p>

  <form v-if="!submitted" class="nf__form" @submit.prevent="subscribe">
    <input
      v-model="email"
      type="email"
      placeholder="tu@correo.com"
      class="nf__input"
      aria-label="Tu correo electrónico"
      required
      :disabled="subscribing"
    />
    <button type="submit" class="btn btn--primary nf__btn" :disabled="subscribing">
      {{ subscribing ? 'Enviando…' : buttonLabel }}
    </button>
  </form>
  <p v-if="subscribeError" class="nf__error" role="alert">{{ subscribeError }}</p>
  <p v-else-if="!submitted" class="nf__fine">Cancelás cuando quieras, en un clic.</p>

  <div v-else class="nf__ok" role="status">
    <svg
      width="19"
      height="19"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 10.5l5 5L17.5 5" />
    </svg>
    <span>{{ successMessage }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { http } from '@/services/http'

// `source` viaja tal cual a NewsletterSubscriber.source (ver admin de
// suscripciones) — cada punto de entrada al formulario pasa el suyo, así se
// puede distinguir de dónde vino el alta (ej. "homepage-hero" vs
// "header-modal" vs "plans-waitlist"). El copy es configurable porque este
// mismo formulario se reutiliza tanto para el alta al newsletter como para
// la lista de espera de PlansView.vue — la lógica de suscripción es
// idéntica, solo cambia el texto alrededor.
const props = withDefaults(
  defineProps<{
    source: string
    title?: string
    description?: string
    buttonLabel?: string
    successMessage?: string
  }>(),
  {
    title: 'Un artículo nuevo por semana',
    description: 'Sin ruido y sin spam. Solo el contenido nuevo, cuando sale, directo a tu correo.',
    buttonLabel: 'Me sumo',
    successMessage: '¡Listo! Te suscribiste correctamente.',
  }
)

const email = ref('')
const submitted = ref(false)
const subscribing = ref(false)
const subscribeError = ref('')

async function subscribe() {
  subscribing.value = true
  subscribeError.value = ''
  try {
    await http('/newsletter/subscribe', {
      method: 'POST',
      body: { email: email.value, source: props.source },
      skipAuthRetry: true,
    })
    submitted.value = true
    email.value = ''
  } catch {
    subscribeError.value = 'No pudimos guardar tu suscripción. Probá de nuevo en un momento.'
  } finally {
    subscribing.value = false
  }
}
</script>

<style scoped>
.nf__arch {
  width: 54px;
  height: 54px;
  border-radius: 999px 999px 15px 15px / 28px 28px 15px 15px;
  background: var(--color-primary);
  color: #fffdfa;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.dark .nf__arch {
  color: #191512;
}

.nf__title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  text-align: center;
}

.nf__desc {
  font-size: 0.96rem;
  color: var(--color-ink-secondary);
  line-height: 1.7;
  max-width: 42ch;
  text-align: center;
  margin-bottom: 12px;
}

.nf__form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  max-width: 460px;
}

.nf__input {
  flex: 1 1 200px;
  min-width: 0;
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  padding: 14px 20px;
  border-radius: var(--radius-full);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.25s ease;
}

.nf__input:focus {
  border-color: var(--color-primary);
}

.nf__btn {
  flex: 1 1 auto;
}

.nf__fine {
  font-size: 0.78rem;
  color: var(--color-ink-faint);
  text-align: center;
}

.nf__error {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  text-align: center;
}

.nf__ok {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  background: var(--color-surface);
  border: 1px solid var(--color-primary-light);
  border-radius: var(--radius-full);
  padding: 15px 28px;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--color-primary-dark);
}
</style>
