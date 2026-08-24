<template>
  <div class="container auth">
    <div class="auth__card">
      <p class="eyebrow auth__eyebrow">Cuenta de lector</p>
      <h1 class="auth__title">Confirmar email</h1>

      <p v-if="status === 'loading'" class="auth__lead">Confirmando tu email…</p>

      <template v-else-if="status === 'ok'">
        <p class="auth__lead">¡Listo! Tu email quedó confirmado.</p>
        <RouterLink to="/" class="btn btn--primary auth__submit">Ir al inicio</RouterLink>
      </template>

      <template v-else>
        <p class="auth__error" role="alert">
          Este enlace no es válido o ya venció. Confirmar tu email es opcional — tu cuenta funciona
          igual sin hacerlo — pero si querés reintentar, pedí un enlace nuevo desde tu perfil.
        </p>
        <RouterLink to="/" class="btn btn--ghost auth__submit">Ir al inicio</RouterLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const status = ref<'loading' | 'ok' | 'error'>('loading')

onMounted(async () => {
  const token = route.query.token
  if (typeof token !== 'string' || !token) {
    status.value = 'error'
    return
  }
  status.value = (await authStore.verifyEmail(token)) ? 'ok' : 'error'
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
  text-align: center;
}

.auth__eyebrow {
  margin-bottom: 8px;
}

.auth__title {
  font-size: 1.8rem;
  margin-bottom: 16px;
}

.auth__lead {
  font-size: 0.95rem;
  color: var(--color-ink-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
}

.auth__error {
  font-size: 0.88rem;
  line-height: 1.6;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  margin-bottom: 24px;
}

.auth__submit {
  width: 100%;
}
</style>
