<template>
  <!-- <dialog> nativo: atrapa el foco, cierra con Esc y bloquea el fondo sin
       que haya que implementar nada de eso a mano. -->
  <dialog ref="dialogEl" class="cdlg" @cancel.prevent="onCancel">
    <form class="cdlg__form" method="dialog" @submit.prevent="emit('confirm')">
      <h2 class="cdlg__title">{{ title }}</h2>

      <div class="cdlg__body">
        <slot />
      </div>

      <p v-if="error" class="cdlg__error" role="alert">{{ error }}</p>

      <div class="cdlg__actions">
        <button type="button" class="btn btn--ghost" :disabled="busy" @click="onCancel">
          Cancelar
        </button>
        <button
          type="submit"
          class="btn"
          :class="tone === 'danger' ? 'btn--accent' : 'btn--primary'"
          :disabled="busy"
        >
          {{ busy ? busyLabel : confirmLabel }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    confirmLabel: string
    busyLabel?: string
    busy?: boolean
    error?: string
    tone?: 'primary' | 'danger'
  }>(),
  { busyLabel: 'Procesando…', busy: false, error: '', tone: 'primary' }
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const dialogEl = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => {
    const el = dialogEl.value
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }
)

function onCancel() {
  if (props.busy) return
  emit('cancel')
}
</script>

<style scoped>
.cdlg {
  width: min(480px, calc(100vw - 32px));
  padding: 0;
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  color: var(--color-ink);
  box-shadow: var(--shadow-lg);
}

.cdlg::backdrop {
  background: rgba(20, 16, 12, 0.45);
  backdrop-filter: blur(2px);
}

.cdlg__form {
  padding: 26px 26px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cdlg__title {
  font-size: 1.15rem;
  margin: 0;
}

.cdlg__body {
  font-size: 0.9rem;
  line-height: 1.65;
  color: var(--color-ink-secondary);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cdlg__error {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}

.cdlg__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.cdlg__actions .btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
