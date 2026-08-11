<template>
  <div class="list">
    <div class="list__head">
      <select v-model="activeFilter" class="list__select" @change="fetchPage(1)">
        <option value="">Todos</option>
        <option value="true">Activos</option>
        <option value="false">Dados de baja</option>
      </select>
      <span class="list__total">{{ total }} suscriptores</span>
    </div>

    <p v-if="errorMessage" class="list__error" role="alert">{{ errorMessage }}</p>

    <div class="list__table-wrap">
      <table class="list__table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Origen</th>
            <th>Estado</th>
            <th>Suscripto</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="4" class="list__empty">Cargando…</td>
          </tr>
          <tr v-else-if="!subscribers.length">
            <td colspan="4" class="list__empty">Todavía no hay suscriptores.</td>
          </tr>
          <tr v-for="sub in subscribers" v-else :key="sub.id">
            <td class="list__title">{{ sub.email }}</td>
            <td class="list__sub">{{ sub.source ?? '—' }}</td>
            <td>
              <span class="pill" :class="sub.isActive ? 'pill--active' : 'pill--inactive'">
                {{ sub.isActive ? 'Activo' : 'De baja' }}
              </span>
            </td>
            <td class="list__date">{{ formatDate(sub.subscribedAt) }}</td>
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
import { listSubscribers } from '@/services/admin/subscribers.api'
import type { NewsletterSubscriber } from '@/types/admin'

const subscribers = ref<NewsletterSubscriber[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

const activeFilter = ref<'' | 'true' | 'false'>('')
const page = ref(1)
const total = ref(0)
const pageSize = 25

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function fetchPage(nextPage: number) {
  page.value = nextPage
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await listSubscribers({
      isActive: activeFilter.value === '' ? undefined : activeFilter.value === 'true',
      page: page.value,
      pageSize,
    })
    subscribers.value = res.items
    total.value = res.total
  } catch {
    errorMessage.value = 'No pudimos cargar los suscriptores.'
  } finally {
    isLoading.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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
  margin-bottom: 22px;
}

.list__select {
  background: var(--color-surface);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 9px 14px;
  font-size: 0.86rem;
}

.list__total {
  font-size: 0.82rem;
  color: var(--color-ink-muted);
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

.list__title {
  font-weight: 700;
  color: var(--color-ink);
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

.pill--active {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.pill--inactive {
  background: var(--color-surface-sunken);
  color: var(--color-ink-muted);
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
