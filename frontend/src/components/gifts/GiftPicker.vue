<template>
  <div class="gift-picker">
    <label
      v-for="ebook in ebooks"
      :key="ebook.id"
      class="gift-picker__option"
      :class="{ 'is-selected': modelValue === ebook.id }"
    >
      <input
        type="radio"
        name="welcomeEbook"
        :value="ebook.id"
        :checked="modelValue === ebook.id"
        :disabled="disabled"
        @change="$emit('update:modelValue', ebook.id)"
      />
      <button
        type="button"
        class="gift-picker__cover"
        :aria-label="`Ver más grande: ${ebook.title}`"
        @click.stop.prevent="openPreview(ebook)"
      >
        <img v-if="ebook.coverImage" :src="ebook.coverImage" :alt="ebook.title" />
        <span v-else class="gift-picker__cover-fallback" aria-hidden="true">📖</span>
        <span class="gift-picker__zoom-hint" aria-hidden="true">🔍</span>
      </button>
      <span class="gift-picker__copy">
        <span class="gift-picker__title">{{ ebook.title }}</span>
        <span v-if="ebook.subtitle" class="gift-picker__subtitle">{{ ebook.subtitle }}</span>
        <span class="gift-picker__summary">{{ ebook.summary }}</span>
      </span>
    </label>

    <!-- Vista ampliada — pura lectura, no selecciona por sí sola: el usuario confirma con
         "Elegir este libro" o cierra y elige desde la tarjeta. -->
    <dialog ref="previewEl" class="gift-preview" @cancel.prevent="closePreview">
      <div v-if="previewing" class="gift-preview__body">
        <button type="button" class="gift-preview__close" aria-label="Cerrar" @click="closePreview">
          ✕
        </button>

        <div class="gift-preview__cover">
          <img v-if="previewing.coverImage" :src="previewing.coverImage" :alt="previewing.title" />
          <span v-else class="gift-preview__cover-fallback" aria-hidden="true">📖</span>
        </div>

        <div class="gift-preview__copy">
          <h2 class="gift-preview__title">{{ previewing.title }}</h2>
          <p v-if="previewing.subtitle" class="gift-preview__subtitle">
            {{ previewing.subtitle }}
          </p>
          <p class="gift-preview__summary">{{ previewing.summary }}</p>

          <button type="button" class="btn btn--primary gift-preview__pick" @click="choosePreview">
            Elegir este libro
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { WelcomeEbook } from '@/types/gifts'

defineProps<{
  ebooks: WelcomeEbook[]
  modelValue: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const previewEl = ref<HTMLDialogElement | null>(null)
const previewing = ref<WelcomeEbook | null>(null)

function openPreview(ebook: WelcomeEbook) {
  previewing.value = ebook
  previewEl.value?.showModal()
}

function closePreview() {
  previewEl.value?.close()
  previewing.value = null
}

function choosePreview() {
  if (previewing.value) emit('update:modelValue', previewing.value.id)
  closePreview()
}
</script>

<style scoped>
.gift-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gift-picker__option {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 13px 16px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.gift-picker__option:hover {
  border-color: var(--color-primary);
}

.gift-picker__option.is-selected {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}

.gift-picker__option input {
  margin-top: 4px;
  flex-shrink: 0;
  accent-color: var(--color-primary);
}

/* El doble de tamaño que antes (48×64) — una portada más chica no le da al usuario
   nada para juzgar; con esto ya se lee el título/arte sin necesitar el zoom. */
.gift-picker__cover {
  position: relative;
  flex-shrink: 0;
  width: 96px;
  height: 128px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-canvas-alt);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-in;
}

.gift-picker__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gift-picker__cover-fallback {
  font-size: 2.2rem;
}

.gift-picker__zoom-hint {
  position: absolute;
  right: 5px;
  bottom: 5px;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: rgba(20, 16, 12, 0.6);
  color: #fff;
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.gift-picker__cover:hover .gift-picker__zoom-hint,
.gift-picker__cover:focus-visible .gift-picker__zoom-hint {
  opacity: 1;
}

.gift-picker__copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.gift-picker__title {
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 60;
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--color-ink);
}

.gift-picker__subtitle {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.gift-picker__summary {
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--color-ink-secondary);
  margin-top: 2px;
}

/* ── Vista ampliada ── */
.gift-preview {
  position: fixed;
  inset: 0;
  margin: auto;
  width: min(640px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  padding: 0;
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  color: var(--color-ink);
  box-shadow: var(--shadow-lg);
}

.gift-preview::backdrop {
  background: rgba(20, 16, 12, 0.45);
  backdrop-filter: blur(2px);
}

.gift-preview__body {
  position: relative;
  padding: 28px;
  display: flex;
  gap: 24px;
}

.gift-preview__close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  color: var(--color-ink-muted);
  font-size: 0.85rem;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.gift-preview__close:hover {
  background: var(--color-canvas-alt);
  color: var(--color-ink);
}

.gift-preview__cover {
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

.gift-preview__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gift-preview__cover-fallback {
  font-size: 3.4rem;
}

.gift-preview__copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding-top: 4px;
}

.gift-preview__title {
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 60;
  font-size: 1.3rem;
  margin: 0;
}

.gift-preview__subtitle {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-ink-muted);
  margin: 0;
}

.gift-preview__summary {
  font-size: 0.9rem;
  line-height: 1.65;
  color: var(--color-ink-secondary);
  margin: 4px 0 0;
}

.gift-preview__pick {
  align-self: flex-start;
  margin-top: 14px;
}

@media (max-width: 560px) {
  .gift-preview__body {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px 20px;
  }

  .gift-preview__cover {
    width: 160px;
  }
}
</style>
