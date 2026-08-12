import type { ArticleFormPayload } from '@/types/admin'
import type { ArticleSource, Audience, Level } from '@/types'

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

  if (meta.fecha) data.publishedAt = meta.fecha
  if (meta.fuentesList.length) data.sources = meta.fuentesList

  // Se guarda toda la metadata cruda del .md (fecha, estado, temas, auditoría,
  // etc.) sin transformar, como referencia — no se usa para renderizar nada.
  data.importMetadata = {
    ...meta.extra,
    titulo: meta.titulo,
    subtitulo: meta.subtitulo,
    fecha: meta.fecha,
    temas: meta.temasList,
    nivel: meta.nivel,
    audiencia: meta.audienciaList,
    palabras_clave: meta.palabrasClaveList,
    descripcion: meta.descripcion,
    fuentes: meta.fuentesList,
  }

  const fileSlug = fileNameToSlug(fileName)
  if (fileSlug) data.slug = fileSlug

  return { data, unknownCategorySlugs, warnings }
}

interface ParsedMeta {
  titulo?: string
  subtitulo?: string
  descripcion?: string
  fecha?: string
  nivel?: string
  temasList: string[]
  audienciaList: string[]
  palabrasClaveList: string[]
  fuentesList: ArticleSource[]
  /** Claves sueltas no mapeadas a un campo conocido (estado, auditoria_externa, verificacion_factual, ...). */
  extra: Record<string, string>
}

/**
 * Parsea el bloque de metadata. No es YAML válido (ver comentario de más
 * arriba), así que se resuelve a mano con indentación: claves de primer
 * nivel sin sangría, listas simples con `  - item`, y `fuentes` como lista
 * de objetos (`  - titulo: "..."` seguido de `    url: "..."` / `    descripcion: "..."`
 * indentados un nivel más, sin guion).
 */
function parseMetaBlock(metaLines: string[]): ParsedMeta {
  const meta: ParsedMeta = {
    temasList: [],
    audienciaList: [],
    palabrasClaveList: [],
    fuentesList: [],
    extra: {},
  }
  let currentList: string[] | null = null
  let currentListKey: string | null = null
  let currentSource: Partial<ArticleSource> | null = null

  const flushSource = () => {
    if (currentSource?.title && currentSource?.url) {
      meta.fuentesList.push({
        title: currentSource.title,
        url: currentSource.url,
        description: currentSource.description ?? '',
      })
    }
    currentSource = null
  }

  for (const rawLine of metaLines) {
    if (rawLine.trim() === '') continue
    const indent = rawLine.length - rawLine.trimStart().length

    // Campo anidado de una fuente en curso: "    url: ..." (sin guion).
    if (currentSource && indent >= 4 && !rawLine.trimStart().startsWith('- ')) {
      const kv = rawLine.trim().match(/^([a-z_]+):\s*(.*)$/i)
      if (kv) {
        const [, key, value] = kv
        if (key === 'titulo') currentSource.title = unquote(value.trim())
        else if (key === 'url') currentSource.url = unquote(value.trim())
        else if (key === 'descripcion') currentSource.description = unquote(value.trim())
        continue
      }
    }

    // Ítem de lista: "  - ..."
    const listItemMatch = rawLine.match(/^\s*-\s*(.*)$/)
    if (listItemMatch) {
      const rest = listItemMatch[1]
      if (currentListKey === 'fuentes') {
        flushSource()
        currentSource = {}
        const kv = rest.match(/^([a-z_]+):\s*(.*)$/i)
        if (kv) {
          const [, key, value] = kv
          if (key === 'titulo') currentSource.title = unquote(value.trim())
          else if (key === 'url') currentSource.url = unquote(value.trim())
          else if (key === 'descripcion') currentSource.description = unquote(value.trim())
        }
        continue
      }
      if (currentList) currentList.push(unquote(rest.trim()))
      continue
    }

    // Clave de primer nivel: "clave: valor"
    flushSource()
    const kvMatch = rawLine.match(/^([a-z_]+):\s*(.*)$/i)
    if (!kvMatch) continue
    const [, key, value] = kvMatch
    currentList = null
    currentListKey = null

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
      case 'fecha':
        meta.fecha = unquote(value.trim())
        break
      case 'nivel':
        meta.nivel = unquote(value.trim())
        break
      case 'temas':
        currentList = meta.temasList
        currentListKey = 'temas'
        break
      case 'palabras_clave':
        currentList = meta.palabrasClaveList
        currentListKey = 'palabras_clave'
        break
      case 'fuentes':
        currentListKey = 'fuentes'
        break
      case 'audiencia':
        meta.audienciaList = value
          .split(',')
          .map((v) => unquote(v.trim()))
          .filter(Boolean)
        break
      default:
        // estado / auditoria_externa / verificacion_factual u otros campos
        // libres: no mapean a un campo del formulario, pero se conservan en
        // `extra` para el volcado a `importMetadata`.
        if (value.trim()) meta.extra[key] = unquote(value.trim())
        break
    }
  }
  flushSource()

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
