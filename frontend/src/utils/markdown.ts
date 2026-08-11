import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ breaks: true, gfm: true })

/**
 * Markdown -> HTML sanitizado. Se usa tanto en el preview del editor admin
 * como en ArticleView.vue del sitio público — nunca se inyecta el HTML de
 * `marked` sin pasar por acá primero (ver docs/features/auth-and-admin-dashboard.md,
 * sección "Contenido de artículo").
 */
export function renderMarkdown(source: string): string {
  const rawHtml = marked.parse(source ?? '', { async: false })
  return DOMPurify.sanitize(rawHtml)
}
