import { http } from '@/services/http'
import type { ArticleScope } from '@/types'
import type { SiteSettings } from '@/types/admin'

export function getSiteSettings(): Promise<SiteSettings> {
  return http<SiteSettings>('/admin/settings')
}

export function updateVisibleArticleScopes(
  visibleArticleScopes: Exclude<ArticleScope, 'publico'>[]
): Promise<SiteSettings> {
  return http<SiteSettings>('/admin/settings', {
    method: 'PATCH',
    body: { visibleArticleScopes },
  })
}
