import { http } from '@/services/http'

export interface UploadedMedia {
  url: string
  publicId: string
}

export function uploadMedia(file: File): Promise<UploadedMedia> {
  const formData = new FormData()
  formData.append('file', file)
  return http<UploadedMedia>('/admin/media', { method: 'POST', body: formData })
}

export function deleteMedia(publicId: string): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/admin/media?publicId=${encodeURIComponent(publicId)}`, {
    method: 'DELETE',
  })
}
