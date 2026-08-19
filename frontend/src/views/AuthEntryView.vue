<template>
  <div class="container auth">
    <div class="auth__card">
      <p class="eyebrow auth__eyebrow">Cuenta de lector</p>
      <h1 class="auth__title">{{ copy.title }}</h1>
      <p class="auth__lead">{{ copy.lead }}</p>

      <p v-if="showOAuthError" class="auth__error" role="alert">
        No pudimos completar el ingreso con Google/Facebook. Probá de nuevo.
      </p>

      <OAuthButtons context="reader" variant="primary" :redirect="redirectTarget()" />

      <RouterLink :to="{ name: copy.emailRouteName, query: route.query }" class="auth__email-link">
        {{ copy.emailLinkText }}
      </RouterLink>

      <p class="auth__switch">
        {{ copy.switchText }}
        <RouterLink :to="{ name: copy.switchRouteName, query: route.query }">
          {{ copy.switchLinkText }}
        </RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Landing "OAuth primero": la opción principal para ingresar/registrarse es
// un click con Google/Facebook, con el formulario de email como alternativa
// secundaria (un link chico, no un botón) — ver docs/features/public-oauth-login.md.
// Un mismo componente sirve para /ingresar y /registrarme vía la prop `mode`,
// declarada como route prop estático en router/index.ts (no hay diferencia
// de comportamiento entre las dos, solo copy y a qué ruta apunta cada link).
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import OAuthButtons from '@/components/auth/OAuthButtons.vue'

const props = defineProps<{ mode: 'login' | 'register' }>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const showOAuthError = computed(() => route.query.error === 'oauth')

const copy = computed(() =>
  props.mode === 'login'
    ? {
        title: 'Ingresar',
        lead: 'Accedé a tu cuenta para leer los artículos de acceso registrado.',
        emailLinkText: 'o ingresar con correo electrónico',
        emailRouteName: 'login-email',
        switchText: '¿Todavía no tenés cuenta?',
        switchLinkText: 'Registrate gratis',
        switchRouteName: 'register',
      }
    : {
        title: 'Registrate gratis',
        lead: 'Creá tu cuenta para acceder a los artículos de nivel registrado sin costo.',
        emailLinkText: 'o registrate con correo electrónico',
        emailRouteName: 'register-email',
        switchText: '¿Ya tenés cuenta?',
        switchLinkText: 'Ingresá',
        switchRouteName: 'login',
      }
)

function redirectTarget(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' ? redirect : '/'
}

onMounted(async () => {
  await authStore.bootstrap()
  if (authStore.isAuthenticated) {
    router.replace(redirectTarget())
    return
  }
  // Sin ningún proveedor OAuth configurado, esta pantalla no tendría nada
  // para ofrecer — se salta directo al formulario de email en vez de
  // mostrar una tarjeta vacía con un solo link chico.
  if (!authStore.providers.google && !authStore.providers.facebook) {
    router.replace({ name: copy.value.emailRouteName, query: route.query })
  }
})
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

.auth__error {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin-bottom: 20px;
}

.auth__email-link {
  display: block;
  text-align: center;
  margin-top: 20px;
  font-size: 0.85rem;
  color: var(--color-ink-secondary);
  text-decoration: underline;
  text-decoration-color: var(--color-line);
  text-underline-offset: 3px;
}

.auth__email-link:hover {
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
