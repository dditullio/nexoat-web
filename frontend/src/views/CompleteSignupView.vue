<template>
  <div class="container auth">
    <div class="auth__card">
      <template v-if="!token">
        <p class="eyebrow auth__eyebrow">Cuenta de lector</p>
        <h1 class="auth__title">Enlace inválido</h1>
        <p class="auth__lead">
          Este enlace no es válido o ya venció. Pedí uno nuevo desde
          <RouterLink to="/registrarme/correo">registrarme</RouterLink>.
        </p>
      </template>

      <template v-else>
        <p class="eyebrow auth__eyebrow">Cuenta de lector</p>
        <h1 class="auth__title">Terminá de crear tu cuenta</h1>
        <p class="auth__lead">Ya confirmamos tu email. Elegí tu nombre y una contraseña.</p>

        <form class="auth__form" @submit.prevent="onSubmit">
          <label class="auth__field">
            <span class="auth__label">Nombre</span>
            <input
              v-model="name"
              type="text"
              autocomplete="name"
              required
              class="auth__input"
              :disabled="isSubmitting"
            />
          </label>

          <label class="auth__field">
            <span class="auth__label">Contraseña</span>
            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              class="auth__input"
              :disabled="isSubmitting"
            />
            <span class="auth__hint">Mínimo 8 caracteres.</span>
          </label>

          <label class="auth__field">
            <span class="auth__label">Confirmar contraseña</span>
            <input
              v-model="passwordConfirm"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              class="auth__input"
              :disabled="isSubmitting"
            />
          </label>

          <p v-if="errorMessage" class="auth__error" role="alert">{{ errorMessage }}</p>

          <button type="submit" class="btn btn--primary auth__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Creando cuenta…' : 'Crear cuenta' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/services/http'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const token = computed(() => {
  const t = route.query.token
  return typeof t === 'string' && t ? t : ''
})

const name = ref('')
const password = ref('')
const passwordConfirm = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

function redirectTarget(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' ? redirect : '/'
}

async function onSubmit() {
  if (password.value !== passwordConfirm.value) {
    errorMessage.value = 'Las contraseñas no coinciden.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  try {
    await authStore.completeSignup(token.value, name.value, password.value, passwordConfirm.value)
    // Ya queda logueado — el guard del router lo manda a /bienvenida solo
    // (nunca directo al redirect) si el onboarding sigue pendiente; una vez
    // completado, OnboardingView.vue lee este mismo query param y termina
    // el viaje ahí. `redirect` viene del link de activación del correo (ver
    // RegisterView.vue / auth.service.ts#sendActivationEmail).
    router.push(redirectTarget())
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError && err.status === 400
        ? 'Este enlace no es válido o ya venció.'
        : 'No pudimos crear la cuenta. Probá de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.auth {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-block: 64px;
}

.auth__card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
  padding: 40px 36px;
}

.auth__eyebrow {
  margin-bottom: 8px;
}

.auth__title {
  font-size: 1.8rem;
  margin-bottom: 10px;
}

.auth__lead {
  font-size: 0.92rem;
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 28px;
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.auth__field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.auth__label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-ink-muted);
}

.auth__input {
  background: var(--color-canvas);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 11px 14px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

.auth__input:focus-visible {
  border-color: var(--color-primary);
}

.auth__input:disabled {
  opacity: 0.6;
}

.auth__hint {
  font-size: 0.76rem;
  color: var(--color-ink-faint);
}

.auth__error {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}

.auth__submit {
  width: 100%;
  margin-top: 6px;
}
</style>
