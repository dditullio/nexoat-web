<template>
  <div class="list">
    <div class="list__head">
      <div class="list__filters">
        <input
          v-model="entityType"
          type="search"
          placeholder="Tipo de entidad (ej. Article, User)…"
          class="list__search"
          @input="onFilterInput"
        />
      </div>
    </div>

    <p v-if="errorMessage" class="list__error" role="alert">{{ errorMessage }}</p>

    <div class="list__table-wrap">
      <table class="list__table">
        <thead>
          <tr>
            <th>Acción</th>
            <th>Actor</th>
            <th>Entidad</th>
            <th>Cuándo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="4" class="list__empty">Cargando…</td>
          </tr>
          <tr v-else-if="!logs.length">
            <td colspan="4" class="list__empty">Sin registros con estos filtros.</td>
          </tr>
          <tr v-for="log in logs" v-else :key="log.id">
            <td>
              <span class="list__action-code">{{ log.action }}</span>
            </td>
            <td>{{ log.actor?.name ?? log.actor?.email ?? '—' }}</td>
            <td>
              <span v-if="log.entityType" class="list__sub"
                >{{ log.entityType
                }}<template v-if="log.entityId"> · {{ shortId(log.entityId) }}</template></span
              >
              <span v-else>—</span>
            </td>
            <td class="list__date">{{ formatDate(log.createdAt) }}</td>
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
import { computed, ref } from 'vue'
import { listAuditLogs } from '@/services/admin/audit.api'
import type { AuditLogEntry } from '@/types/admin'

const logs = ref<AuditLogEntry[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

const entityType = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 25

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
    const res = await listAuditLogs({
      entityType: entityType.value || undefined,
      page: page.value,
      pageSize,
    })
    logs.value = res.items
    total.value = res.total
  } catch {
    errorMessage.value = 'No pudimos cargar la auditoría.'
  } finally {
    isLoading.value = false
  }
}

function shortId(id: string) {
  return id.slice(0, 8)
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

.list__action-code {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.8rem;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
}

.list__sub {
  color: var(--color-ink-muted);
  font-size: 0.82rem;
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
