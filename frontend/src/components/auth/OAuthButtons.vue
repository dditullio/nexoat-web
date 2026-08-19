<template>
  <template v-if="authStore.providers.google || authStore.providers.facebook">
    <div class="oauth-divider"><span>o continuá con</span></div>
    <div class="oauth-buttons">
      <a v-if="authStore.providers.google" :href="href('google')" class="btn btn--ghost">
        Google
      </a>
      <a v-if="authStore.providers.facebook" :href="href('facebook')" class="btn btn--ghost">
        Facebook
      </a>
    </div>
  </template>
</template>

<script setup lang="ts">
// Botones compartidos por AdminLoginView, LoginView y RegisterView — arman
// el link a GET /auth/:provider con `context`/`redirect` en la query, que
// el backend traduce a un `state` de OAuth para saber a qué landing volver
// (admin vs. lector) y a qué ruta final. Ver docs/features/public-oauth-login.md.
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  context: 'admin' | 'reader'
  redirect?: string
}>()

const authStore = useAuthStore()
const apiUrl = import.meta.env.VITE_API_URL

function href(provider: 'google' | 'facebook'): string {
  const params = new URLSearchParams({ context: props.context })
  if (props.redirect) params.set('redirect', props.redirect)
  return `${apiUrl}/auth/${provider}?${params.toString()}`
}
</script>

<style scoped>
.oauth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 26px 0 18px;
  font-size: 0.78rem;
  color: var(--color-ink-faint);
}

.oauth-divider::before,
.oauth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-line-light);
}

.oauth-buttons {
  display: flex;
  gap: 10px;
}

.oauth-buttons .btn {
  flex: 1;
}
</style>
