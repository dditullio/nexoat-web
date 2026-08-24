<template>
  <div class="container auth">
    <div class="auth__card">
      <p class="eyebrow auth__eyebrow">Cuenta de lector</p>
      <h1 class="auth__title">Recuperar contraseña</h1>

      <template v-if="sent">
        <p class="auth__lead">
          Si <strong>{{ email }}</strong> tiene una cuenta con contraseña en NexoAT, te mandamos un
          email con instrucciones para elegir una nueva.
        </p>
        <RouterLink to="/ingresar/correo" class="btn btn--ghost auth__submit">
          Volver a ingresar
        </RouterLink>
      </template>

      <template v-else>
        <p class="auth__lead">
          Ingresá el email de tu cuenta y te mandamos un enlace para elegir una contraseña nueva.
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

          <button type="submit" class="btn btn--primary auth__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Enviando…' : 'Mandar enlace' }}
          </button>
        </form>

        <RouterLink to="/ingresar/correo" class="auth__forgot">Volver a ingresar</RouterLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const email = ref('')
const isSubmitting = ref(false)
const sent = ref(false)

async function onSubmit() {
  isSubmitting.value = true
  try {
    await authStore.requestPasswordReset(email.value)
    sent.value = true
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

.auth__submit {
  width: 100%;
  margin-top: 6px;
}

.auth__forgot {
  display: block;
  text-align: center;
  margin-top: 20px;
  font-size: 0.85rem;
  color: var(--color-ink-faint);
  text-decoration: underline;
  text-decoration-color: var(--color-line);
  text-underline-offset: 3px;
}

.auth__forgot:hover {
  color: var(--color-ink);
}
</style>
