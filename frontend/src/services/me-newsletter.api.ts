import { http } from '@/services/http'

export function getNewsletterStatus(): Promise<{ subscribed: boolean }> {
  return http<{ subscribed: boolean }>('/me/newsletter')
}

export function subscribeToNewsletter(): Promise<{ ok: true; email: string }> {
  return http<{ ok: true; email: string }>('/me/newsletter/subscribe', { method: 'POST' })
}

export function unsubscribeFromNewsletter(): Promise<{ ok: true }> {
  return http<{ ok: true }>('/me/newsletter/unsubscribe', { method: 'POST' })
}
