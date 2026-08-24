import { http, httpBlob } from '@/services/http'
import type { EbookClaim, WelcomeEbook } from '@/types/gifts'

export function getAvailableGifts(): Promise<WelcomeEbook[]> {
  return http<WelcomeEbook[]>('/gifts/available')
}

export function getMyGiftClaim(): Promise<EbookClaim | null> {
  return http<EbookClaim | null>('/gifts/my-claim')
}

export function claimGift(ebookId: string): Promise<EbookClaim> {
  return http<EbookClaim>('/gifts/claim', { method: 'POST', body: { ebookId } })
}

/**
 * La descarga necesita el header `Authorization`, así que no puede ser un
 * link directo — mismo patrón que downloadBackup (admin/backups.api.ts).
 */
export async function downloadMyGift(filename: string): Promise<void> {
  const blob = await httpBlob('/gifts/download')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
