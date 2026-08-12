<template>
  <div class="list">
    <div class="list__head">
      <div class="list__filters">
        <input
          v-model="search"
          type="search"
          placeholder="Buscar por título…"
          class="list__search"
          @input="onSearchInput"
        />
        <select v-model="status" class="list__select" @change="fetchPage(1)">
          <option value="">Todos los status</option>
          <option value="borrador">Borrador</option>
          <option value="publicado">Publicado</option>
          <option value="archivado">Archivado</option>
        </select>
        <select v-model="category" class="list__select" @change="fetchPage(1)">
          <option value="">Todas las categorías</option>
          <option v-for="c in categoryOptions" :key="c.slug" :value="c.slug">{{ c.name }}</option>
        </select>
        <select v-model="scope" class="list__select" @change="fetchPage(1)">
          <option value="">Todo alcance</option>
          <option value="publico">Público</option>
          <option value="suscriptores_nivel_1">Registrados</option>
          <option value="suscriptores_nivel_2">Nivel 2</option>
          <option value="suscriptores_nivel_3">Nivel 3</option>
        </select>
      </div>

      <RouterLink to="/nexoat-admin/articulos/nuevo" class="btn btn--primary">
        Nuevo artículo
      </RouterLink>
    </div>

    <p v-if="errorMessage" class="list__error" role="alert">{{ errorMessage }}</p>

    <div class="list__table-wrap">
      <table class="list__table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Categorías</th>
            <th>Status</th>
            <th>Alcance</th>
            <th>Actualizado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="6" class="list__empty">Cargando…</td>
          </tr>
          <tr v-else-if="!articles.length">
            <td colspan="6" class="list__empty">No hay artículos con estos filtros.</td>
          </tr>
          <tr v-for="article in articles" v-else :key="article.id">
            <td>
              <RouterLink :to="`/nexoat-admin/articulos/${article.id}`" class="list__title">
                {{ article.title }}
              </RouterLink>
            </td>
            <td>
              <span class="list__cats">{{ article.categories.join(', ') || '—' }}</span>
            </td>
            <td>
              <span class="pill" :class="`pill--${article.status}`">{{
                STATUS_LABELS[article.status]
              }}</span>
            </td>
            <td>
              <span
                v-if="article.scope !== 'publico'"
                class="pill pill--scope"
                :title="SCOPE_LABELS[article.scope]"
              >
                {{ SCOPE_LABELS[article.scope] }}
              </span>
              <span v-else class="list__cats">Público</span>
            </td>
            <td class="list__date">{{ formatDate(article.updatedAt) }}</td>
            <td class="list__actions">
              <RouterLink :to="`/nexoat-admin/articulos/${article.id}`" class="list__action">
                Editar
              </RouterLink>
              <button class="list__action list__action--danger" @click="onDelete(article)">
                Borrar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="list__pager">
      <button :disabled="page <= 1" @click="fetchPage(page - 1)">← Anterior</button>
      <span>Página {{ page }} de {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="fetchPage(page + 1)">Siguiente →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  deleteArticle,
  listAdminArticles,
  listCategoryOptions,
  type CategoryOption,
} from '@/services/admin/articles.api'
import type { AdminArticle, ArticleStatus } from '@/types/admin'
import type { ArticleScope } from '@/types'

const STATUS_LABELS: Record<ArticleStatus, string> = {
  borrador: 'Borrador',
  publicado: 'Publicado',
  archivado: 'Archivado',
}

const SCOPE_LABELS: Record<ArticleScope, string> = {
  publico: 'Público',
  suscriptores_nivel_1: 'Registrados',
  suscriptores_nivel_2: 'Nivel 2',
  suscriptores_nivel_3: 'Nivel 3',
}

const articles = ref<AdminArticle[]>([])
const categoryOptions = ref<CategoryOption[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

const search = ref('')
const status = ref('')
const category = ref('')
const scope = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 20

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

let searchDebounce: ReturnType<typeof setTimeout> | undefined

function onSearchInput() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => fetchPage(1), 350)
}

async function fetchPage(nextPage: number) {
  page.value = nextPage
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await listAdminArticles({
      search: search.value || undefined,
      status: status.value || undefined,
      category: category.value || undefined,
      scope: scope.value || undefined,
      page: page.value,
      pageSize,
    })
    articles.value = res.items
    total.value = res.total
  } catch {
    errorMessage.value = 'No pudimos cargar los artículos.'
  } finally {
    isLoading.value = false
  }
}

async function onDelete(article: AdminArticle) {
  if (!confirm(`¿Borrar "${article.title}" definitivamente?`)) return
  try {
    await deleteArticle(article.id)
    await fetchPage(articles.value.length === 1 && page.value > 1 ? page.value - 1 : page.value)
  } catch {
    errorMessage.value = 'No pudimos borrar el artículo.'
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(async () => {
  fetchPage(1)
  try {
    categoryOptions.value = await listCategoryOptions()
  } catch {
    // el selector de categoría queda vacío — no bloquea el resto del listado
  }
})
</script>

<style scoped>
.list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.list__filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.list__search,
.list__select {
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 9px 14px;
  font-size: 0.86rem;
}

.list__search {
  min-width: 220px;
}

.list__error {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent-dark);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin-bottom: 16px;
}

.list__table-wrap {
  background: var(--color-surface);
  border: 1px solid var(--color-line-light);
  border-radius: var(--radius-xl);
  overflow: auto;
}

.list__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
}

.list__table th {
  text-align: left;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-ink-faint);
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-line-light);
  white-space: nowrap;
}

.list__table td {
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-line-faint);
  vertical-align: middle;
}

.list__table tr:last-child td {
  border-bottom: none;
}

.list__title {
  font-weight: 700;
  color: var(--color-ink);
}

.list__title:hover {
  color: var(--color-primary-dark);
}

.list__cats {
  color: var(--color-ink-muted);
  font-size: 0.8rem;
}

.list__date {
  color: var(--color-ink-muted);
  white-space: nowrap;
}

.list__empty {
  text-align: center;
  padding: 40px;
  color: var(--color-ink-faint);
  font-style: italic;
}

.pill--borrador {
  background: var(--color-surface-sunken);
  color: var(--color-ink-muted);
}

.pill--publicado {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.pill--archivado {
  background: var(--color-accent-soft);
  color: var(--color-accent-dark);
}

.pill--scope {
  background: var(--color-ochre-soft);
  color: var(--color-ink-secondary);
}

.list__actions {
  display: flex;
  gap: 14px;
  white-space: nowrap;
}

.list__action {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-primary-dark);
}

.list__action--danger {
  color: var(--color-accent-dark);
}

.list__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 22px;
  font-size: 0.85rem;
  color: var(--color-ink-muted);
}

.list__pager button {
  font-weight: 700;
  color: var(--color-primary-dark);
}

.list__pager button:disabled {
  color: var(--color-ink-faint);
  cursor: not-allowed;
}
</style>
