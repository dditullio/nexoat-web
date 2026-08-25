<template>
  <div class="container gift-view">
    <div class="gift-view__card">
      <p v-if="isLoading" class="section-lead">Cargando…</p>

      <template v-else-if="claim">
        <p class="gift-view__eyebrow">Tu regalo de bienvenida</p>
        <img
          v-if="claim.ebook.coverImage"
          :src="claim.ebook.coverImage"
          :alt="`Portada de ${claim.ebook.title}`"
          class="gift-view__cover"
        />
        <h1 class="gift-view__title">{{ claim.ebook.title }}</h1>
        <p v-if="claim.ebook.subtitle" class="gift-view__subtitle">{{ claim.ebook.subtitle }}</p>
        <p class="gift-view__summary">{{ claim.ebook.summary }}</p>

        <button
          type="button"
          class="btn btn--primary gift-view__submit"
          :disabled="isDownloading"
          @click="onDownload"
        >
          {{ isDownloading ? 'Descargando…' : 'Descargar mi ebook' }}
        </button>

        <p v-if="downloadError" class="gift-view__error" role="alert">{{ downloadError }}</p>
      </template>

      <template v-else-if="availableEbooks.length">
        <p class="gift-view__eyebrow">Regalo de bienvenida</p>
        <h1 class="gift-view__title">Elegí tu ebook</h1>
        <p class="gift-view__lead">Todavía no elegiste el tuyo — es tuyo apenas lo confirmes.</p>

        <GiftPicker v-model="selectedId" :ebooks="availableEbooks" :disabled="isClaiming" />

        <p v-if="claimError" class="gift-view__error" role="alert">{{ claimError }}</p>

        <button
          type="button"
          class="btn btn--primary gift-view__submit"
          :disabled="!selectedId || isClaiming"
          @click="onClaim"
        >
          {{ isClaiming ? 'Guardando…' : 'Elegir este ebook' }}
        </button>
      </template>

      <template v-else>
        <p class="gift-view__eyebrow">Regalo de bienvenida</p>
        <h1 class="gift-view__title">Todavía no hay títulos disponibles</h1>
        <p class="gift-view__lead">
          Estamos preparando los ebooks de regalo — volvé a pasar más adelante.
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import GiftPicker from '@/components/gifts/GiftPicker.vue'
import { claimGift, downloadMyGift, getAvailableGifts, getMyGiftClaim } from '@/services/gifts.api'
import { ApiError } from '@/services/http'
import type { EbookClaim, WelcomeEbook } from '@/types/gifts'

const isLoading = ref(true)
const claim = ref<EbookClaim | null>(null)
const availableEbooks = ref<WelcomeEbook[]>([])

const selectedId = ref<string | null>(null)
const isClaiming = ref(false)
const claimError = ref('')

const isDownloading = ref(false)
const downloadError = ref('')

async function load() {
  isLoading.value = true
  try {
    claim.value = await getMyGiftClaim()
    if (!claim.value) {
      availableEbooks.value = await getAvailableGifts()
    }
  } finally {
    isLoading.value = false
  }
}

async function onClaim() {
  if (!selectedId.value) return
  claimError.value = ''
  isClaiming.value = true
  try {
    claim.value = await claimGift(selectedId.value)
  } catch (err) {
    claimError.value =
      err instanceof ApiError ? err.message : 'No pudimos guardar tu elección. Probá de nuevo.'
  } finally {
    isClaiming.value = false
  }
}

async function onDownload() {
  if (!claim.value) return
  downloadError.value = ''
  isDownloading.value = true
  try {
    await downloadMyGift(claim.value.ebook.fileName ?? `${claim.value.ebook.slug}.pdf`)
  } catch {
    downloadError.value = 'No pudimos descargar el archivo. Probá de nuevo.'
  } finally {
    isDownloading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.gift-view {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-block: 64px;
}

.gift-view__card {
  width: 100%;
  max-width: 520px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gift-view__eyebrow {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-ink-faint);
  margin: 0;
}

.gift-view__cover {
  width: 140px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  align-self: center;
}

.gift-view__title {
  font-size: 1.5rem;
  margin: 0;
}

.gift-view__subtitle {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-ink-muted);
  margin: -8px 0 0;
}

.gift-view__lead,
.gift-view__summary {
  font-size: 0.92rem;
  color: var(--color-ink-secondary);
  line-height: 1.6;
}

.gift-view__submit {
  margin-top: 8px;
}

.gift-view__error {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}
</style>
