import type { ArticleFormPayload } from '@/types/admin'
import type { Audience, Level } from '@/types'

const LEVEL_VALUES: Level[] = ['basico', 'intermedio', 'avanzado']
const AUDIENCE_VALUES: Audience[] = ['cuidadores-familiares', 'profesionales', 'mixto']

export interface ParsedArticleImport {
  data: Partial<ArticleFormPayload> & { tagsInput?: string }
  /** Slugs de `temas` que no matchean ninguna categoría conocida — se avisa, no se inventan. */
  unknownCategorySlugs: string[]
  warnings: string[]
}

/**
 * Parsea el formato casero de los .md de los artículos (ver
 * docs/features/article-md-import.md para el detalle completo). No es YAML
 * válido — abre con `---` pero nunca lo cierra antes de la metadata; el
 * cierre real es la primera línea `# Título`. Por eso no se usa un parser
 * YAML genérico, se resuelve a mano.
 *
 * `knownCategorySlugs` se usa para no marcar categorías que no existen en
 * el backend — los `temas` que no matcheen quedan en `unknownCategorySlugs`.
 */
export function parseArticleMarkdown(
  raw: string,
  knownCategorySlugs: string[],
  fileName?: string
): ParsedArticleImport {
  const warnings: string[] = []
  const unknownCategorySlugs: string[] = []
  const lines = raw.split(/\r?\n/)

  if (lines[0]?.trim() !== '---') {
    return {
      data: {},
      unknownCategorySlugs,
      warnings: [
        'El archivo no empieza con "---" — no parece tener el encabezado de metadata esperado.',
      ],
    }
  }

  const h1Index = lines.findIndex((line) => line.startsWith('# '))
  if (h1Index === -1) {
    return {
      data: {},
      unknownCategorySlugs,
      warnings: ['No se encontró la línea "# Título" que cierra el bloque de metadata.'],
    }
  }

  const meta = parseMetaBlock(lines.slice(1, h1Index))

  // Cuerpo: todo lo que sigue al H1.
  const body = lines.slice(h1Index + 1)
  while (body[0]?.trim() === '') body.shift()
  // Párrafo en cursiva de una sola línea justo después del H1 — eco del
  // subtítulo/descripción, no es contenido real.
  const first = body[0]?.trim()
  if (first && first.startsWith('*') && first.endsWith('*') && first.length > 1) {
    body.shift()
  }

  let content = body.join('\n')
  // Separadores visuales "---" sueltos — no son <hr> intencionales.
  content = content
    .split('\n')
    .filter((line) => line.trim() !== '---')
    .join('\n')
  // Disclaimer final — ya se renderiza fijo en ArticleView.vue.
  content = content.replace(/\n*>\s*[^\n]*aviso[\s\S]*$/i, '')
  content = content.replace(/\n{3,}/g, '\n\n').trim()

  const data: Partial<ArticleFormPayload> & { tagsInput?: string } = { content }

  if (meta.titulo) data.title = meta.titulo
  else warnings.push('No se encontró "titulo" en la metadata.')

  if (meta.subtitulo) data.subtitle = meta.subtitulo
  if (meta.descripcion) data.excerpt = meta.descripcion

  if (meta.temasList.length) {
    const known = meta.temasList.filter((slug) => knownCategorySlugs.includes(slug))
    unknownCategorySlugs.push(
      ...meta.temasList.filter((slug) => !knownCategorySlugs.includes(slug))
    )
    if (known.length) data.categorySlugs = known
    if (unknownCategorySlugs.length) {
      warnings.push(
        `Temas sin categoría equivalente (no se marcaron): ${unknownCategorySlugs.join(', ')}`
      )
    }
  }

  if (meta.nivel) {
    if (LEVEL_VALUES.includes(meta.nivel as Level)) data.level = meta.nivel as Level
    else
      warnings.push(`Nivel "${meta.nivel}" no reconocido — se dejó el valor actual del formulario.`)
  }

  if (meta.audienciaList.length) {
    const audience = meta.audienciaList.filter((a): a is Audience =>
      AUDIENCE_VALUES.includes(a as Audience)
    )
    const invalid = meta.audienciaList.filter((a) => !AUDIENCE_VALUES.includes(a as Audience))
    if (audience.length) data.audience = audience
    if (invalid.length)
      warnings.push(`Audiencia sin valor reconocido (ignorada): ${invalid.join(', ')}`)
  }

  if (meta.palabrasClaveList.length) data.tagsInput = meta.palabrasClaveList.join(', ')

  const fileSlug = fileNameToSlug(fileName)
  if (fileSlug) data.slug = fileSlug

  return { data, unknownCategorySlugs, warnings }
}

interface ParsedMeta {
  titulo?: string
  subtitulo?: string
  descripcion?: string
  nivel?: string
  temasList: string[]
  audienciaList: string[]
  palabrasClaveList: string[]
}

function parseMetaBlock(metaLines: string[]): ParsedMeta {
  const meta: ParsedMeta = { temasList: [], audienciaList: [], palabrasClaveList: [] }
  let currentList: string[] | null = null

  for (const rawLine of metaLines) {
    const line = rawLine.replace(/\s+$/, '')
    if (line.trim() === '') continue

    const listItemMatch = line.match(/^\s*-\s*(.+)$/)
    if (listItemMatch && currentList) {
      currentList.push(unquote(listItemMatch[1].trim()))
      continue
    }

    const kvMatch = line.match(/^([a-z_]+):\s*(.*)$/i)
    if (!kvMatch) continue
    const [, key, value] = kvMatch
    currentList = null

    switch (key) {
      case 'titulo':
        meta.titulo = unquote(value.trim())
        break
      case 'subtitulo':
        meta.subtitulo = unquote(value.trim())
        break
      case 'descripcion':
        meta.descripcion = unquote(value.trim())
        break
      case 'nivel':
        meta.nivel = unquote(value.trim())
        break
      case 'temas':
        currentList = meta.temasList
        break
      case 'palabras_clave':
        currentList = meta.palabrasClaveList
        break
      case 'audiencia':
        meta.audienciaList = value
          .split(',')
          .map((v) => unquote(v.trim()))
          .filter(Boolean)
        break
      default:
        // fecha / estado / auditoria_externa u otros campos: no se mapean
        // a ningún campo del formulario, ver docs/features/article-md-import.md
        break
    }
  }

  return meta
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function fileNameToSlug(fileName: string | undefined): string | undefined {
  if (!fileName) return undefined
  return fileName.replace(/\.md$/i, '')
}
