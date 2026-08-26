<template>
  <div class="list">
    <div class="list__head">
      <div class="list__filters">
        <input
          v-model="q"
          type="search"
          placeholder="Buscar en el texto del comentario…"
          class="list__search"
          @input="onFilterInput"
        />
        <select v-model="status" class="list__select" @change="fetchPage(1)">
          <option value="">Todos los estados</option>
          <option value="visible">Visibles</option>
          <option value="oculto">Ocultos</option>
          <option value="eliminado">Borrados</option>
        </select>
        <label class="list__reported">
          <input v-model="reportedOnly" type="checkbox" @change="fetchPage(1)" />
          Solo reportados
        </label>
      </div>
    </div>

    <p v-if="errorMessage" class="list__error" role="alert">{{ errorMessage }}</p>

    <div class="list__table-wrap">
      <table class="list__table">
        <thead>
          <tr>
            <th>Comentario</th>
            <th>Autor</th>
            <th>Artículo</th>
            <th>Estado</th>
            <th>Reportes</th>
            <th>Cuándo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="7" class="list__empty">Cargando…</td>
          </tr>
          <tr v-else-if="!comments.length">
            <td colspan="7" class="list__empty">Sin comentarios con estos filtros.</td>
          </tr>
          <tr v-for="c in comments" v-else :key="c.id">
            <td class="list__body-cell">
              <span v-if="c.status === 'eliminado'" class="list__deleted"
                >(comentario borrado)</span
              >
              <template v-else>{{ c.body }}</template>
            </td>
            <td>
              <span class="list__sub">{{ c.author.name ?? c.author.email }}</span>
            </td>
            <td>
              <RouterLink
                :to="`/articulo/${c.article.slug}#comentarios`"
                target="_blank"
                class="list__sub"
              >
                {{ c.article.title }}
              </RouterLink>
            </td>
            <td>
              <span class="pill" :class="STATUS_CLASS[c.status]">{{ STATUS_LABEL[c.status] }}</span>
            </td>
            <td>
              <span v-if="c.reportCount" class="list__reports">{{ c.reportCount }}</span>
              <span v-else class="list__sub">—</span>
            </td>
            <td class="list__date">{{ formatDate(c.createdAt) }}</td>
            <td class="list__actions">
              <template v-if="c.status !== 'eliminado'">
                <button
                  type="button"
                  class="list__action-btn"
                  :disabled="busyId === c.id"
                  @click="toggleStatus(c)"
                >
                  {{ c.status === 'oculto' ? 'Restaurar' : 'Ocultar' }}
                </button>
                <button
                  v-if="authStore.hasRole('ADMIN', 'SUPER_ADMIN')"
                  type="button"
                  class="list__action-btn list__action-btn--danger"
                  :disabled="busyId === c.id"
                  @click="pendingDelete = c"
                >
                  Borrar
                </button>
              </template>
              <span v-else class="list__sub">—</span>
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

    <ConfirmDialog
      :open="!!pendingDelete"
      title="Borrar comentario"
      confirm-label="Borrar"
      busy-label="Borrando…"
      tone="danger"
      :busy="!!busyId"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    >
      <p>Esta acción no se puede deshacer.</p>
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  listAdminComments,
  setCommentStatus,
  deleteAdminComment,
  type AdminCommentEntry,
} from '@/services/admin/comments.api'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const authStore = useAuthStore()

const comments = ref<AdminCommentEntry[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

const STATUS_LABEL: Record<AdminCommentEntry['status'], string> = {
  visible: 'Visible',
  oculto: 'Oculto',
  eliminado: 'Borrado',
}
const STATUS_CLASS: Record<AdminCommentEntry['status'], string> = {
  visible: 'list__status--visible',
  oculto: 'list__status--hidden',
  eliminado: 'list__status--deleted',
}

const q = ref('')
const status = ref<'' | 'visible' | 'oculto' | 'eliminado'>('')
const reportedOnly = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 25
const busyId = ref<string | null>(null)
const pendingDelete = ref<AdminCommentEntry | null>(null)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

let filterDebounce: ReturnType<typeof setTimeout> | undefined
function onFilterInput() {
  clearTimeout(filterDebounce)
  filterDebounce = setTimeout(() => fetchPage(1), 350)
}

async function fetchPage(nextPage: number) {
  page.value = nextPage
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await listAdminComments({
      q: q.value || undefined,
      status: status.value || undefined,
      reported: reportedOnly.value || undefined,
      page: page.value,
      pageSize,
    })
    comments.value = res.items
    total.value = res.total
  } catch {
    errorMessage.value = 'No pudimos cargar los comentarios.'
  } finally {
    isLoading.value = false
  }
}

async function toggleStatus(c: AdminCommentEntry) {
  busyId.value = c.id
  try {
    const next = c.status === 'oculto' ? 'visible' : 'oculto'
    await setCommentStatus(c.id, next)
    c.status = next
  } catch {
    errorMessage.value = 'No pudimos actualizar el estado del comentario.'
  } finally {
    busyId.value = null
  }
}

async function confirmDelete() {
  const target = pendingDelete.value
  if (!target) return
  busyId.value = target.id
  try {
    await deleteAdminComment(target.id)
    // Borrado lógico, no físico (ver docs/features/article-comments.md,
    // decisión 8): la fila se sigue mostrando, marcada como "Borrado", en
    // vez de desaparecer de la lista.
    target.status = 'eliminado'
    target.body = ''
    pendingDelete.value = null
  } catch {
    errorMessage.value = 'No pudimos borrar el comentario.'
  } finally {
    busyId.value = null
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

fetchPage(1)
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
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.list__search {
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 9px 14px;
  font-size: 0.86rem;
  min-width: 280px;
}

.list__select {
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 9px 12px;
  font-size: 0.86rem;
}

.list__reported {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.84rem;
  color: var(--color-ink-secondary);
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
  padding: 12px 18px;
  border-bottom: 1px solid var(--color-line-faint);
  vertical-align: middle;
}

.list__table tr:last-child td {
  border-bottom: none;
}

.list__body-cell {
  max-width: 360px;
  color: var(--color-ink);
}

.list__sub {
  color: var(--color-ink-muted);
  font-size: 0.82rem;
}

.list__status--visible {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.list__status--hidden {
  background: var(--color-accent-soft);
  color: var(--color-accent-dark);
}

.list__status--deleted {
  background: var(--color-surface-sunken);
  color: var(--color-ink-faint);
}

.list__deleted {
  font-style: italic;
  color: var(--color-ink-faint);
}

.list__reports {
  font-weight: 700;
  color: var(--color-accent-dark);
}

.list__date {
  color: var(--color-ink-muted);
  white-space: nowrap;
}

.list__actions {
  display: flex;
  gap: 8px;
  white-space: nowrap;
}

.list__action-btn {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-primary-dark);
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-line);
}

.list__action-btn:hover:not(:disabled) {
  background: var(--color-canvas-alt);
}

.list__action-btn--danger {
  color: var(--color-accent-dark);
}

.list__action-btn:disabled {
  opacity: 0.6;
}

.list__empty {
  text-align: center;
  padding: 40px;
  color: var(--color-ink-faint);
  font-style: italic;
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
