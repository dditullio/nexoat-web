<template>
  <div class="container auth">
    <div class="auth__card">
      <template v-if="sent">
        <p class="eyebrow auth__eyebrow">Cuenta de lector</p>
        <h1 class="auth__title">Revisá tu correo</h1>
        <p class="auth__lead">
          Te mandamos un link a <strong>{{ email }}</strong> para confirmar tu cuenta. Puede tardar
          unos minutos en llegar.
        </p>
        <p class="auth__spam">
          <strong>¿No lo ves?</strong> Revisá también la carpeta de spam o promociones — a veces el
          primer correo de un remitente nuevo cae ahí.
        </p>
        <RouterLink to="/ingresar/correo" class="btn btn--ghost auth__submit">
          Volver a ingresar
        </RouterLink>
      </template>

      <template v-else>
        <p class="eyebrow auth__eyebrow">Cuenta de lector</p>
        <h1 class="auth__title">Registrate gratis</h1>
        <p class="auth__lead">
          Ingresá tu email y te mandamos un link para confirmar tu cuenta y elegir tu contraseña.
        </p>

        <form class="auth__form" @submit.prevent="onSubmit">
          <label class="auth__field">
            <span class="auth__label">Email</span>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="auth__input"
              :disabled="isSubmitting"
            />
          </label>

          <p v-if="errorMessage" class="auth__error" role="alert">{{ errorMessage }}</p>

          <button type="submit" class="btn btn--primary auth__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Enviando…' : 'Continuar' }}
          </button>
        </form>

        <RouterLink
          v-if="oauthLabel"
          :to="{ name: 'register', query: route.query }"
          class="auth__oauth-link"
        >
          o registrate con {{ oauthLabel }}
        </RouterLink>

        <p class="auth__switch">
          ¿Ya tenés cuenta?
          <RouterLink :to="{ name: 'login', query: route.query }">Ingresá</RouterLink>
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const sent = ref(false)

// Vuelve a la landing "OAuth primero" (AuthEntryView) — el label lista solo
// los proveedores que el backend reporta configurados, así nunca ofrece
// "Facebook" si esas credenciales todavía no están cargadas.
const PROVIDER_NAMES = { google: 'Google', facebook: 'Facebook' } as const
const oauthLabel = computed(() =>
  (Object.keys(PROVIDER_NAMES) as (keyof typeof PROVIDER_NAMES)[])
    .filter((p) => authStore.providers[p])
    .map((p) => PROVIDER_NAMES[p])
    .join(' o ')
)

onMounted(async () => {
  await authStore.bootstrap()
  if (authStore.isAuthenticated) router.replace(redirectTarget())
})

function redirectTarget(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' ? redirect : '/'
}

async function onSubmit() {
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    // Siempre resuelve, exista o no el email ya con cuenta — el backend
    // nunca lo revela (evita enumeración). El mensaje "revisá tu correo" es
    // el mismo en los dos casos, lo que cambia es qué email real llega.
    // El redirect (ej. volver al artículo donde estaba comentando) viaja en
    // el link de activación del correo — ver CompleteSignupView.vue.
    const redirect = route.query.redirect
    await authStore.requestSignup(email.value, typeof redirect === 'string' ? redirect : undefined)
    sent.value = true
  } catch {
    errorMessage.value = 'No pudimos procesar el pedido. Probá de nuevo.'
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

.auth__spam {
  font-size: 0.86rem;
  line-height: 1.6;
  color: var(--color-ink-secondary);
  background: var(--color-ochre-soft);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  margin-bottom: 24px;
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

.auth__oauth-link {
  display: block;
  text-align: center;
  margin-top: 20px;
  font-size: 0.85rem;
  color: var(--color-ink-secondary);
  text-decoration: underline;
  text-decoration-color: var(--color-line);
  text-underline-offset: 3px;
}

.auth__oauth-link:hover {
  color: var(--color-primary-dark);
}

.auth__switch {
  margin-top: 24px;
  text-align: center;
  font-size: 0.88rem;
  color: var(--color-ink-secondary);
}

.auth__switch a {
  font-weight: 700;
  color: var(--color-primary-dark);
  text-decoration: underline;
  text-decoration-color: var(--color-line);
  text-underline-offset: 3px;
}
</style>
