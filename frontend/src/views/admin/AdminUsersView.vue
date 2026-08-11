<template>
  <div class="list">
    <div class="list__head">
      <div class="list__filters">
        <input
          v-model="search"
          type="search"
          placeholder="Buscar por email o nombre…"
          class="list__search"
          @input="onSearchInput"
        />
        <select v-model="roleFilter" class="list__select" @change="fetchPage(1)">
          <option value="">Todos los roles</option>
          <option v-for="r in ROLE_ORDER" :key="r" :value="r">{{ ROLE_LABELS[r] }}</option>
        </select>
      </div>
    </div>

    <p v-if="errorMessage" class="list__error" role="alert">{{ errorMessage }}</p>

    <div class="list__table-wrap">
      <table class="list__table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Alta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="4" class="list__empty">Cargando…</td>
          </tr>
          <tr v-else-if="!users.length">
            <td colspan="4" class="list__empty">No hay usuarios con estos filtros.</td>
          </tr>
          <tr v-for="user in users" v-else :key="user.id">
            <td>
              <span class="list__title">{{ user.name ?? user.email }}</span>
              <span v-if="user.name" class="list__sub">{{ user.email }}</span>
            </td>
            <td>
              <select
                v-if="canChangeRoles && user.id !== authStore.user?.id"
                class="list__select list__select--sm"
                :value="user.role"
                @change="onRoleChange(user, $event)"
              >
                <option v-for="r in ROLE_ORDER" :key="r" :value="r">{{ ROLE_LABELS[r] }}</option>
              </select>
              <span v-else class="pill">{{ ROLE_LABELS[user.role] }}</span>
            </td>
            <td>
              <button
                v-if="user.id !== authStore.user?.id"
                class="pill list__status-btn"
                :class="user.isActive ? 'pill--active' : 'pill--inactive'"
                @click="onToggleActive(user)"
              >
                {{ user.isActive ? 'Activo' : 'Desactivado' }}
              </button>
              <span v-else class="pill pill--active">Activo</span>
            </td>
            <td class="list__date">{{ formatDate(user.createdAt) }}</td>
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
import { listUsers, updateUser } from '@/services/admin/users.api'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/services/http'
import type { AdminUser } from '@/types/admin'
import type { Role } from '@/types/auth'

const ROLE_ORDER: Role[] = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'USER']
const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  USER: 'Usuario',
}

const authStore = useAuthStore()
const canChangeRoles = computed(() => authStore.hasRole('SUPER_ADMIN'))

const users = ref<AdminUser[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

const search = ref('')
const roleFilter = ref<Role | ''>('')
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
    const res = await listUsers({
      search: search.value || undefined,
      role: roleFilter.value || undefined,
      page: page.value,
      pageSize,
    })
    users.value = res.items
    total.value = res.total
  } catch {
    errorMessage.value = 'No pudimos cargar los usuarios.'
  } finally {
    isLoading.value = false
  }
}

async function onRoleChange(user: AdminUser, event: Event) {
  const role = (event.target as HTMLSelectElement).value as Role
  if (role === user.role) return
  try {
    const updated = await updateUser(user.id, { role })
    Object.assign(user, updated)
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'No pudimos cambiar el rol.'
    ;(event.target as HTMLSelectElement).value = user.role
  }
}

async function onToggleActive(user: AdminUser) {
  try {
    const updated = await updateUser(user.id, { isActive: !user.isActive })
    Object.assign(user, updated)
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'No pudimos cambiar el estado.'
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

.list__select--sm {
  padding: 5px 10px;
  font-size: 0.8rem;
}

.list__search {
  min-width: 240px;
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
  display: block;
  font-weight: 700;
  color: var(--color-ink);
}

.list__sub {
  display: block;
  font-size: 0.76rem;
  color: var(--color-ink-faint);
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

.list__status-btn {
  cursor: pointer;
  border: none;
}

.pill--active {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.pill--inactive {
  background: var(--color-accent-soft);
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
