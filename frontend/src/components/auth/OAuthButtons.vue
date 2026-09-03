<template>
  <template v-if="activeProviders.length">
    <div v-if="variant === 'secondary'" class="oauth-divider"><span>o continuá con</span></div>
    <div class="oauth-buttons" :class="{ 'oauth-buttons--stacked': variant === 'primary' }">
      <!-- rel="nofollow": es un <a href> real (no un RouterLink, tiene que
           salir de la SPA), así que Google lo sigue como cualquier link —
           sin esto terminaba rastreando `api.nexoat.com/v1/auth/...` desde
           cualquier página que muestre este botón (ver docs/features/seo.md,
           sección "Long tail" / hallazgos de Search Console). -->
      <a
        v-for="(provider, i) in activeProviders"
        :key="provider"
        :href="href(provider)"
        rel="nofollow noopener"
        class="btn"
        :class="variant === 'primary' && i === 0 ? 'btn--primary' : 'btn--ghost'"
      >
        {{ variant === 'primary' ? `Continuar con ${LABELS[provider]}` : LABELS[provider] }}
      </a>
    </div>
  </template>
</template>

<script setup lang="ts">
// Botones compartidos por AdminLoginView (oculto, ver comentario ahí),
// AuthEntryView, LoginView y RegisterView — arman el link a GET
// /auth/:provider con `context`/`redirect` en la query, que el backend
// traduce a un `state` de OAuth para saber a qué landing volver (admin vs.
// lector) y a qué ruta final. Ver docs/features/public-oauth-login.md.
//
// `variant="secondary"` (default): fila de botones ghost bajo un divisor,
// para acompañar un formulario de email ya visible (AdminLoginView).
// `variant="primary"`: la opción principal de la pantalla (AuthEntryView) —
// el primer proveedor configurado se destaca en sólido, el resto en ghost,
// apilados y sin divisor.
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = withDefaults(
  defineProps<{
    context: 'admin' | 'reader'
    redirect?: string
    variant?: 'primary' | 'secondary'
  }>(),
  { variant: 'secondary', redirect: undefined }
)

const LABELS = { google: 'Google', facebook: 'Facebook' } as const
type Provider = keyof typeof LABELS

const authStore = useAuthStore()
const apiUrl = import.meta.env.VITE_API_URL

const activeProviders = computed<Provider[]>(() =>
  (Object.keys(LABELS) as Provider[]).filter((p) => authStore.providers[p])
)

function href(provider: Provider): string {
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

.oauth-buttons--stacked {
  flex-direction: column;
}
</style>
