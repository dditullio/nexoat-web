<template>
  <div class="container auth">
    <div class="auth__card">
      <p class="eyebrow auth__eyebrow">Cuenta de lector</p>
      <h1 class="auth__title">Elegir nueva contraseña</h1>

      <template v-if="!token">
        <p class="auth__error" role="alert">
          Este enlace no es válido o ya venció. Pedí uno nuevo desde
          <RouterLink to="/recuperar-contrasena">recuperar contraseña</RouterLink>.
        </p>
      </template>

      <template v-else-if="done">
        <p class="auth__lead">
          Listo, tu contraseña se actualizó. Por seguridad, cerramos cualquier otra sesión abierta
          con la contraseña anterior.
        </p>
        <RouterLink to="/ingresar/correo" class="btn btn--primary auth__submit">
          Ingresar
        </RouterLink>
      </template>

      <template v-else>
        <p class="auth__lead">Elegí una contraseña nueva para tu cuenta.</p>

        <form class="auth__form" @submit.prevent="onSubmit">
          <label class="auth__field">
            <span class="auth__label">Contraseña nueva</span>
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

          <p v-if="errorMessage" class="auth__error" role="alert">{{ errorMessage }}</p>

          <button type="submit" class="btn btn--primary auth__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Guardando…' : 'Guardar contraseña' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/services/http'

const route = useRoute()
const authStore = useAuthStore()

const token = computed(() => {
  const t = route.query.token
  return typeof t === 'string' && t ? t : ''
})

const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const done = ref(false)

async function onSubmit() {
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    await authStore.resetPassword(token.value, password.value)
    done.value = true
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError && err.status === 400
        ? 'Este enlace no es válido o ya venció.'
        : 'No pudimos guardar la contraseña. Probá de nuevo.'
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

.auth__error a {
  text-decoration: underline;
}

.auth__submit {
  width: 100%;
  margin-top: 6px;
}
</style>
