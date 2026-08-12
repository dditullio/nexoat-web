import { http } from '@/services/http'
import type { AdminCategory } from '@/types/admin'

export function listAdminCategories() {
  return http<AdminCategory[]>('/admin/categories')
}

export function updateCategoryImage(
  id: string,
  payload: { coverImage?: string; coverImagePublicId?: string }
) {
  return http<AdminCategory>(`/admin/categories/${id}`, { method: 'PATCH', body: payload })
}
