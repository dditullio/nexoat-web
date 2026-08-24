<template>
  <div v-if="visible" class="evb">
    <div class="container evb__inner">
      <p class="evb__text">
        Todavía no confirmaste tu email
        <span v-if="sent">— te mandamos un enlace nuevo, revisá tu bandeja.</span>
        <span v-else>. Es opcional, pero te sirve para recuperar tu cuenta si hace falta.</span>
      </p>
      <div class="evb__actions">
        <button
          v-if="!sent"
          type="button"
          class="evb__resend"
          :disabled="isSending"
          @click="onResend"
        >
          {{ isSending ? 'Enviando…' : 'Reenviar email' }}
        </button>
        <button
          type="button"
          class="evb__close"
          aria-label="Cerrar aviso"
          @click="dismissed = true"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Se descarta por sesión de pestaña (no persiste): si vuelve a cargar la
// página, el aviso reaparece hasta que confirme el email de verdad — no
// bloquea nada, solo recuerda la acción pendiente.
const dismissed = ref(false)
const isSending = ref(false)
const sent = ref(false)

const visible = computed(
  () => authStore.isAuthenticated && !authStore.user?.emailVerified && !dismissed.value
)

async function onResend() {
  isSending.value = true
  try {
    await authStore.resendVerification()
    sent.value = true
  } finally {
    isSending.value = false
  }
}
</script>

<style scoped>
.evb {
  background: var(--color-ochre-soft);
  border-bottom: 1px solid var(--color-ochre);
}

.evb__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 32px;
}

.evb__text {
  font-size: 0.85rem;
  color: var(--color-ink-secondary);
  text-align: center;
}

.evb__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.evb__resend {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-ink);
  text-decoration: underline;
  text-decoration-color: var(--color-line);
  text-underline-offset: 3px;
  white-space: nowrap;
}

.evb__resend:disabled {
  opacity: 0.6;
  pointer-events: none;
}

.evb__close {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-faint);
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.evb__close:hover {
  background: rgba(0, 0, 0, 0.06);
}
</style>
