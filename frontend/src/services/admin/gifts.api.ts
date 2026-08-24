import { http } from '@/services/http'
import type { AdminWelcomeEbook, GiftFormPayload } from '@/types/gifts'

export function listAdminGifts(): Promise<AdminWelcomeEbook[]> {
  return http<AdminWelcomeEbook[]>('/admin/gifts')
}

export function createGift(payload: GiftFormPayload): Promise<AdminWelcomeEbook> {
  return http<AdminWelcomeEbook>('/admin/gifts', { method: 'POST', body: payload })
}

export function updateGift(
  id: string,
  payload: Partial<GiftFormPayload>
): Promise<AdminWelcomeEbook> {
  return http<AdminWelcomeEbook>(`/admin/gifts/${id}`, { method: 'PATCH', body: payload })
}

export function uploadGiftFile(id: string, file: File): Promise<AdminWelcomeEbook> {
  const formData = new FormData()
  formData.append('file', file)
  return http<AdminWelcomeEbook>(`/admin/gifts/${id}/file`, { method: 'POST', body: formData })
}

export function removeGiftFile(id: string): Promise<AdminWelcomeEbook> {
  return http<AdminWelcomeEbook>(`/admin/gifts/${id}/file`, { method: 'DELETE' })
}
