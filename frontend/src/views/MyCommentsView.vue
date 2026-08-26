<template>
  <div class="container library">
    <p class="eyebrow library__eyebrow">Mi cuenta</p>
    <h1 class="library__title">Mis comentarios</h1>
    <p class="library__lead">Todo lo que comentaste en el sitio, con los likes que recibiste.</p>

    <p v-if="isLoading" class="library__state">Cargando…</p>
    <p v-else-if="!entries.length" class="library__state">
      Todavía no comentaste ningún artículo. Sumá tu opinión al pie de cualquier artículo.
    </p>

    <div v-else class="library__list">
      <RouterLink
        v-for="entry in entries"
        :key="entry.id"
        :to="`/articulo/${entry.article.slug}#comentarios`"
        class="mc__row"
      >
        <div class="mc__main">
          <span class="mc__article">{{ entry.article.title }}</span>
          <p class="mc__body">{{ entry.body }}</p>
        </div>
        <div class="mc__meta">
          <span class="mc__date">{{ formatDate(entry.createdAt) }}</span>
          <span v-if="entry.editedAt" class="mc__edited">Editado</span>
          <span class="mc__likes">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path
                d="M8 13.8s-5.4-3.3-5.4-7.2A3 3 0 0 1 8 4.6a3 3 0 0 1 5.4 2c0 3.9-5.4 7.2-5.4 7.2z"
              />
            </svg>
            {{ entry.likeCount }}
          </span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getMyComments } from '@/services/comments.api'
import type { MyCommentEntry } from '@/types/comments'

const entries = ref<MyCommentEntry[]>([])
const isLoading = ref(true)

async function load() {
  isLoading.value = true
  try {
    const result = await getMyComments(1, 100)
    entries.value = result.items
  } finally {
    isLoading.value = false
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

.mc__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.mc__row:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.mc__main {
  min-width: 0;
  flex: 1;
}

.mc__article {
  display: block;
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 60,
    'WONK' 1;
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--color-primary-dark);
  margin-bottom: 4px;
}

.mc__body {
  font-size: 0.92rem;
  color: var(--color-ink-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.mc__meta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-ink-faint);
}

.mc__likes {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-accent-dark);
}

@media (max-width: 640px) {
  .mc__row {
    flex-direction: column;
    align-items: flex-start;
  }

  .mc__meta {
    align-self: stretch;
    justify-content: space-between;
  }
}
</style>
