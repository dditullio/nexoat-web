<template>
  <div class="container library">
    <p class="eyebrow library__eyebrow">Mi cuenta</p>
    <h1 class="library__title">Artículos guardados</h1>
    <p class="library__lead">Los artículos que guardaste para leer más tarde.</p>

    <p v-if="isLoading" class="library__state">Cargando…</p>
    <p v-else-if="!entries.length" class="library__state">
      Todavía no guardaste ningún artículo. Buscá el ícono de guardar en cualquier artículo para
      sumarlo acá.
    </p>

    <div v-else class="library__list">
      <LibraryArticleRow
        v-for="entry in entries"
        :key="entry.id"
        :article="entry.article"
        :timestamp-label="`Guardado ${formatDate(entry.savedAt)}`"
        remove-label="Quitar de guardados"
        :removing="removingId === entry.id"
        @remove="pendingRemoval = entry"
      />
    </div>

    <ConfirmDialog
      :open="!!pendingRemoval"
      title="¿Quitar de guardados?"
      confirm-label="Quitar"
      busy-label="Quitando…"
      :busy="!!removingId"
      tone="danger"
      @confirm="onConfirmRemove"
      @cancel="pendingRemoval = null"
    >
      <p>
        Vas a quitar «{{ pendingRemoval?.article.title }}» de tus artículos guardados. Si querés
        volver a leerlo más tarde, vas a tener que guardarlo de nuevo.
      </p>
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getSavedArticles, unsaveArticle } from '@/services/saved-articles.api'
import LibraryArticleRow from '@/components/blog/LibraryArticleRow.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { SavedArticleEntry } from '@/types/reader-library'

const entries = ref<SavedArticleEntry[]>([])
const isLoading = ref(true)
const removingId = ref<string | null>(null)
// Ítem candidato a borrar mientras se confirma — distinto de `removingId`
// (que solo está seteado durante el request en curso, para el estado
// "busy" del diálogo).
const pendingRemoval = ref<SavedArticleEntry | null>(null)

async function load() {
  isLoading.value = true
  try {
    const result = await getSavedArticles(1, 100)
    entries.value = result.items
  } finally {
    isLoading.value = false
  }
}

async function onConfirmRemove() {
  const entry = pendingRemoval.value
  if (!entry) return
  removingId.value = entry.id
  try {
    await unsaveArticle(entry.article.slug)
    entries.value = entries.value.filter((e) => e.id !== entry.id)
    pendingRemoval.value = null
  } finally {
    removingId.value = null
  }
}

function formatDate(iso: string): string {
  return `el ${new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

onMounted(load)
</script>

<style scoped>
.library {
  padding-block: 48px 80px;
  max-width: 760px;
}

.library__eyebrow {
  margin-bottom: 8px;
}

.library__title {
  font-size: 2rem;
  margin-bottom: 10px;
}

.library__lead {
  font-size: 0.95rem;
  color: var(--color-ink-secondary);
  line-height: 1.6;
  max-width: 52ch;
  margin-bottom: 32px;
}

.library__state {
  font-size: 0.92rem;
  color: var(--color-ink-secondary);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-lg);
  padding: 28px;
  text-align: center;
}

.library__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
