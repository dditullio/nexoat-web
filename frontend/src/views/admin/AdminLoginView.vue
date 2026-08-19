<template>
  <div class="login">
    <div class="login__card">
      <RouterLink to="/" class="login__logo">
        Nexo<span class="login__logo-mark">AT</span>
      </RouterLink>
      <p class="login__eyebrow eyebrow eyebrow--plain">Panel de administración</p>
      <h1 class="login__title">Ingresar</h1>

      <form class="login__form" @submit.prevent="onSubmit">
        <label class="login__field">
          <span class="login__label">Email</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="login__input"
            :disabled="isSubmitting"
          />
        </label>

        <label class="login__field">
          <span class="login__label">Contraseña</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="login__input"
            :disabled="isSubmitting"
          />
        </label>

        <p v-if="errorMessage" class="login__error" role="alert">{{ errorMessage }}</p>

        <button type="submit" class="btn btn--primary login__submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>

      <!--
        OAuth (Google/Facebook) para el admin queda oculto a propósito, no
        eliminado: el equipo editorial entra con email, no tiene sentido
        priorizar redes sociales acá. El backend (context=admin) y
        <OAuthButtons /> siguen funcionando igual — si en algún momento se
        quiere reactivar, es agregar `<OAuthButtons context="admin"
        :redirect="redirectTarget()" />` acá de nuevo.
      -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/services/http'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  await authStore.bootstrap()
  if (authStore.isAuthenticated) {
    router.replace(redirectTarget())
  }
})

function redirectTarget(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' ? redirect : '/nexoat-admin'
}

async function onSubmit() {
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    await authStore.login(email.value, password.value)
    router.push(redirectTarget())
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError && err.status === 401
        ? 'Email o contraseña incorrectos.'
        : 'No pudimos iniciar sesión. Probá de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-canvas);
}

.login__card {
  width: 100%;
  max-width: 380px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
  padding: 40px 36px;
}

.login__logo {
  display: block;
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 60,
    'WONK' 1;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-ink);
  margin-bottom: 24px;
}

.login__logo-mark {
  color: var(--color-primary-dark);
}

.login__eyebrow {
  margin-bottom: 8px;
}

.login__title {
  font-size: 1.6rem;
  margin-bottom: 28px;
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.login__field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.login__label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-ink-muted);
}

.login__input {
  background: var(--color-canvas);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 11px 14px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

.login__input:focus-visible {
  border-color: var(--color-primary);
}

.login__input:disabled {
  opacity: 0.6;
}

.login__error {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}

.login__submit {
  width: 100%;
  margin-top: 6px;
}
</style>
