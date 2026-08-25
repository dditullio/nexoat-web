import { http, httpBlobWithFilename } from '@/services/http'
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
 *
 * `fallbackFilename` se usa solo si el backend no mandó (o el navegador no dejó leer)
 * `Content-Disposition` — el nombre real lo arma `GiftsService.openForDownload()` en el momento
 * de la descarga, a partir del título *actual* del ebook (ver
 * docs/features/welcome-ebook-gift.md, Fase 3). Antes este nombre se armaba acá mismo con datos
 * (`ebook.fileName`/`ebook.slug`) que se desincronizaban si el admin editaba el ebook después de
 * que alguien ya lo hubiera reclamado — quedaba con el nombre del título viejo pese a que el
 * backend ya calculaba bien el suyo.
 */
export async function downloadMyGift(fallbackFilename: string): Promise<void> {
  const { blob, filename } = await httpBlobWithFilename('/gifts/download')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename ?? fallbackFilename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
