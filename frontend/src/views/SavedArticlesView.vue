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
        @remove="onRemove(entry.article.slug, entry.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getSavedArticles, unsaveArticle } from '@/services/saved-articles.api'
import LibraryArticleRow from '@/components/blog/LibraryArticleRow.vue'
import type { SavedArticleEntry } from '@/types/reader-library'

const entries = ref<SavedArticleEntry[]>([])
const isLoading = ref(true)
const removingId = ref<string | null>(null)

async function load() {
  isLoading.value = true
  try {
    const result = await getSavedArticles(1, 100)
    entries.value = result.items
  } finally {
    isLoading.value = false
  }
}

async function onRemove(slug: string, entryId: string) {
  removingId.value = entryId
  try {
    await unsaveArticle(slug)
    entries.value = entries.value.filter((e) => e.id !== entryId)
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
