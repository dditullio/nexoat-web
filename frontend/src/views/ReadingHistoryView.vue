<template>
  <div class="container library">
    <div class="library__head">
      <div>
        <p class="eyebrow library__eyebrow">Mi cuenta</p>
        <h1 class="library__title">Historial de lectura</h1>
        <p class="library__lead">Los artículos que visitaste, del más reciente al más antiguo.</p>
      </div>
      <button
        v-if="entries.length"
        type="button"
        class="btn btn--ghost library__clear"
        @click="showConfirm = true"
      >
        Vaciar historial
      </button>
    </div>

    <p v-if="isLoading" class="library__state">Cargando…</p>
    <p v-else-if="!entries.length" class="library__state">
      Todavía no visitaste ningún artículo. Los que vayas leyendo van a aparecer acá.
    </p>

    <div v-else class="library__list">
      <LibraryArticleRow
        v-for="entry in entries"
        :key="entry.id"
        :article="entry.article"
        :timestamp-label="`Leído ${formatRelative(entry.readAt)}`"
        remove-label="Quitar del historial"
        :removing="removingId === entry.id"
        @remove="onRemove(entry.id)"
      />
    </div>

    <ConfirmDialog
      :open="showConfirm"
      title="¿Vaciar todo el historial?"
      confirm-label="Vaciar historial"
      busy-label="Vaciando…"
      :busy="isClearing"
      tone="danger"
      @confirm="onClear"
      @cancel="showConfirm = false"
    >
      <p>
        Se van a borrar las {{ entries.length }} entradas de tu historial de lectura. Esta acción no
        se puede deshacer.
      </p>
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { clearHistory, getHistory, removeHistoryEntry } from '@/services/history.api'
import LibraryArticleRow from '@/components/blog/LibraryArticleRow.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { ReadingHistoryEntry } from '@/types/reader-library'

const entries = ref<ReadingHistoryEntry[]>([])
const isLoading = ref(true)
const removingId = ref<string | null>(null)
const showConfirm = ref(false)
const isClearing = ref(false)

async function load() {
  isLoading.value = true
  try {
    const result = await getHistory(1, 100)
    entries.value = result.items
  } finally {
    isLoading.value = false
  }
}

async function onRemove(id: string) {
  removingId.value = id
  try {
    await removeHistoryEntry(id)
    entries.value = entries.value.filter((e) => e.id !== id)
  } finally {
    removingId.value = null
  }
}

async function onClear() {
  isClearing.value = true
  try {
    await clearHistory()
    entries.value = []
    showConfirm.value = false
  } finally {
    isClearing.value = false
  }
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 1) return 'recién'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours} h`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 30) return `hace ${diffDays} d`
  return `el ${new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

onMounted(load)
</script>

<style scoped>
.library {
  padding-block: 48px 80px;
  max-width: 760px;
}

.library__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 32px;
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
}

.library__clear {
  flex-shrink: 0;
  white-space: nowrap;
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
