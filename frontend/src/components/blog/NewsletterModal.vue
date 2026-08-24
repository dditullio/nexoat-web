<template>
  <!-- <dialog> nativo: atrapa el foco y cierra con Esc sin implementarlo a
       mano (mismo patrón que components/ui/ConfirmDialog.vue). -->
  <dialog ref="dialogEl" class="nm" @cancel.prevent="close" @click="onBackdropClick">
    <div class="nm__panel" @click.stop>
      <button type="button" class="nm__close" aria-label="Cerrar" @click="close">
        <svg
          width="16"
          height="16"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M3 3l12 12M15 3L3 15" />
        </svg>
      </button>

      <div class="nm__body">
        <NewsletterForm source="header-modal" />
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import NewsletterForm from './NewsletterForm.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

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

function close() {
  emit('update:open', false)
}

// El backdrop es el propio <dialog> (fuera de .nm__panel) — un click ahí
// cierra, uno dentro del panel no (el .stop del panel ya corta la
// propagación, esto es la red de contención por si acaso).
function onBackdropClick(event: MouseEvent) {
  if (event.target === dialogEl.value) close()
}
</script>

<style scoped>
.nm {
  /* El reset global (main.css) pone margin: 0 en *, lo que anula el
     margin: auto con el que el navegador centra <dialog> al abrirlo con
     showModal(). Lo centramos a mano con inset + margin: auto. */
  position: fixed;
  inset: 0;
  margin: auto;
  width: min(440px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  padding: 0;
  border: none;
  border-radius: var(--radius-2xl);
  background: transparent;
  overflow: visible;
}

.nm::backdrop {
  background: rgba(20, 16, 12, 0.45);
  backdrop-filter: blur(2px);
}

.nm__panel {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
  padding: clamp(2.25rem, 5vw, 3rem) 28px 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
}

.nm__close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-muted);
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.nm__close:hover {
  background: var(--color-hover-bg);
  color: var(--color-ink);
}

.nm__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
}
</style>
