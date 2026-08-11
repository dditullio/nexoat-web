import { http, toQueryString } from '@/services/http'
import type { AdminUser, Paginated } from '@/types/admin'
import type { Role } from '@/types/auth'

export interface AdminUsersQuery {
  role?: Role
  search?: string
  page?: number
  pageSize?: number
}

export function listUsers(query: AdminUsersQuery = {}) {
  return http<Paginated<AdminUser>>(`/admin/users${toQueryString(query)}`)
}

export function updateUser(id: string, payload: { role?: Role; isActive?: boolean }) {
  return http<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: payload })
}
