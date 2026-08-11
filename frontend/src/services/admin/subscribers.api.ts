import { http, toQueryString } from '@/services/http'
import type { NewsletterSubscriber, Paginated } from '@/types/admin'

export interface SubscribersQuery {
  isActive?: boolean
  page?: number
  pageSize?: number
}

export function listSubscribers(query: SubscribersQuery = {}) {
  return http<Paginated<NewsletterSubscriber>>(
    `/admin/newsletter/subscribers${toQueryString(query)}`
  )
}
