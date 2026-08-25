<template>
  <div class="gift-download">
    <div class="gift-download__cover">
      <img v-if="ebook.coverImage" :src="ebook.coverImage" :alt="`Portada de ${ebook.title}`" />
      <span v-else class="gift-download__cover-fallback" aria-hidden="true">📖</span>
    </div>

    <div class="gift-download__copy">
      <p class="gift-download__eyebrow">{{ eyebrow }}</p>
      <h1 class="gift-download__title">{{ ebook.title }}</h1>
      <p v-if="ebook.subtitle" class="gift-download__subtitle">{{ ebook.subtitle }}</p>
      <p class="gift-download__summary">{{ ebook.summary }}</p>

      <button
        type="button"
        class="btn btn--primary gift-download__submit"
        :disabled="downloading"
        @click="$emit('download')"
      >
        {{ downloading ? 'Descargando…' : 'Descargar mi ebook' }}
      </button>

      <p v-if="error" class="gift-download__error" role="alert">{{ error }}</p>

      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WelcomeEbook } from '@/types/gifts'

withDefaults(
  defineProps<{
    ebook: WelcomeEbook
    eyebrow?: string
    downloading?: boolean
    error?: string
  }>(),
  { eyebrow: 'Tu regalo de bienvenida', downloading: false, error: '' }
)

defineEmits<{ (e: 'download'): void }>()
</script>

<style scoped>
/* Misma disposición que la vista ampliada de GiftPicker.vue (.gift-preview): portada a la
   izquierda, texto a la derecha — el usuario pidió que los dos diálogos de descarga (onboarding
   y ProfileGiftView) compartan diseño con ese, en vez de la tarjeta vertical angosta que tenían
   antes. */
.gift-download {
  display: flex;
  gap: 24px;
}

.gift-download__cover {
  flex-shrink: 0;
  width: 200px;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-canvas-alt);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
}

.gift-download__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gift-download__cover-fallback {
  font-size: 3.4rem;
}

.gift-download__copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding-top: 4px;
}

.gift-download__eyebrow {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-ink-faint);
  margin: 0;
}

.gift-download__title {
  font-size: 1.3rem;
  margin: 0;
}

.gift-download__subtitle {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-ink-muted);
  margin: 0;
}

.gift-download__summary {
  font-size: 0.9rem;
  line-height: 1.65;
  color: var(--color-ink-secondary);
  margin: 4px 0 0;
}

.gift-download__submit {
  align-self: flex-start;
  margin-top: 14px;
}

.gift-download__error {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin: 0;
}

@media (max-width: 560px) {
  .gift-download {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .gift-download__cover {
    width: 160px;
  }

  .gift-download__submit {
    align-self: center;
  }
}
</style>
