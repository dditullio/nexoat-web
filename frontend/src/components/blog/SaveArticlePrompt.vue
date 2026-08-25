<template>
  <div class="save-prompt reveal is-visible">
    <button
      type="button"
      class="save-prompt__dismiss"
      aria-label="Cerrar este aviso"
      @click="$emit('dismiss')"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M1 1l10 10M11 1L1 11"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <svg
      class="save-prompt__icon"
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M4 2.5h8a.5.5 0 01.5.5v10.3a.4.4 0 01-.63.33L8 10.6l-3.87 3.02A.4.4 0 013.5 13.3V3a.5.5 0 01.5-.5z"
      />
    </svg>

    <p class="save-prompt__text">
      <strong>¿Te está resultando útil?</strong>
      Guardalo en tus favoritos y volvé a él cuando lo necesites.
    </p>

    <button
      type="button"
      class="btn btn--primary save-prompt__cta"
      :disabled="saving"
      @click="$emit('save')"
    >
      {{ saving ? 'Guardando…' : 'Guardar en favoritos' }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ saving?: boolean }>()
defineEmits<{ (e: 'save'): void; (e: 'dismiss'): void }>()
</script>

<style scoped>
/* Pensado para vivir dentro de .side (la columna lateral del artículo, ver
   ArticleView.vue) con position: sticky en el contenedor padre — así queda
   anclado abajo en el espacio libre a la derecha sin superponerse a los
   bloques de "Compartir"/"Seguir leyendo" que ya son sticky arriba. */
.save-prompt {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-xl);
  padding: 22px 20px 20px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.save-prompt__dismiss {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  color: var(--color-ink-faint);
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.save-prompt__dismiss:hover {
  background: var(--color-hover-bg);
  color: var(--color-ink);
}

.save-prompt__icon {
  color: var(--color-primary-dark);
}

.save-prompt__text {
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--color-ink-secondary);
  padding-right: 14px;
}

.save-prompt__text strong {
  display: block;
  font-family: var(--font-display);
  font-size: 0.98rem;
  color: var(--color-ink);
  margin-bottom: 3px;
}

.save-prompt__cta {
  align-self: stretch;
  justify-content: center;
  font-size: 0.86rem;
  padding: 0.6rem 1rem;
}
</style>
