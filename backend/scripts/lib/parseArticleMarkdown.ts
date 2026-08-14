/**
 * Copia adaptada de frontend/src/utils/articleMarkdownImport.ts para el
 * script de carga masiva (backend/scripts/bulk-import-articles.ts). No se
 * importa la versión del frontend porque cruzaría el límite de workspace
 * de pnpm (paquetes separados) y depende de tipos del formulario Vue — ver
 * docs/features/bulk-article-import-script.md, sección "El parser de .md
 * se porta, no se comparte".
 *
 * Misma lógica de extracción que el original: mantener ambos en sync si el
 * formato de los .md cambia.
 */

const LEVEL_VALUES = ['basico', 'intermedio', 'avanzado'] as const
const AUDIENCE_VALUES = ['cuidadores-familiares', 'profesionales', 'mixto'] as const
const SCOPE_VALUES = [
  'publico',
  'suscriptores_nivel_1',
  'suscriptores_nivel_2',
  'suscriptores_nivel_3',
] as const

// Tolerancia extra respecto al import individual (frontend): en un lote de
// ~200 archivos escritos a mano por distintas personas aparecen variantes
// de tipeo (tildes, mayúsculas, espacios/barras en vez de guiones) y un
// valor inventado ("publico-general") que no es ninguno de los tres reales
// — se normaliza y, para ese caso puntual, se alía a mano. Ver
// docs/features/bulk-article-import-script.md.
const AUDIENCE_ALIASES: Record<string, string> = {
  'publico-general': 'cuidadores-familiares',
  'cuidadores-familias': 'cuidadores-familiares',
}

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos/tildes (tras normalize('NFD'))
    .toLowerCase()
    .trim()
    .replace(/[\s/]+/g, '-')
}

export interface ParsedArticleSource {
  title: string
  url: string
  description?: string
}

export interface ParsedArticleData {
  title?: string
  slug?: string
  subtitle?: string
  excerpt?: string
  content: string
  level?: string
  audience?: string[]
  scope?: string
  categorySlugs?: string[]
  tags?: string[]
  readingTime?: number
  publishedAt?: string
  sources?: ParsedArticleSource[]
  importMetadata?: Record<string, unknown>
}

export interface ParsedArticleImport {
  data: ParsedArticleData
  unknownCategorySlugs: string[]
  warnings: string[]
}

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
      data: { content: '' },
      unknownCategorySlugs,
      warnings: [
        'El archivo no empieza con "---" — no parece tener el encabezado de metadata esperado.',
      ],
    }
  }

  const h1Index = lines.findIndex((line) => line.startsWith('# '))
  if (h1Index === -1) {
    return {
      data: { content: '' },
      unknownCategorySlugs,
      warnings: ['No se encontró la línea "# Título" que cierra el bloque de metadata.'],
    }
  }

  const meta = parseMetaBlock(lines.slice(1, h1Index))

  const body = lines.slice(h1Index + 1)
  while (body[0]?.trim() === '') body.shift()
  const first = body[0]?.trim()
  if (first && first.startsWith('*') && first.endsWith('*') && first.length > 1) {
    body.shift()
  }

  let content = body.join('\n')
  content = content
    .split('\n')
    .filter((line) => line.trim() !== '---')
    .join('\n')
  content = content.replace(/\n*>\s*[^\n]*aviso[\s\S]*$/i, '')
  content = content.replace(/\n{3,}/g, '\n\n').trim()

  const data: ParsedArticleData = { content }

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
    const normalized = normalizeToken(meta.nivel)
    if ((LEVEL_VALUES as readonly string[]).includes(normalized)) {
      data.level = normalized
      if (normalized !== meta.nivel)
        warnings.push(`Nivel "${meta.nivel}" normalizado a "${normalized}".`)
    } else warnings.push(`Nivel "${meta.nivel}" no reconocido.`)
  }

  if (meta.alcance) {
    if ((SCOPE_VALUES as readonly string[]).includes(meta.alcance)) data.scope = meta.alcance
    else warnings.push(`Alcance "${meta.alcance}" no reconocido — se omite (queda "publico").`)
  }

  if (meta.audienciaList.length) {
    const audience: string[] = []
    const invalid: string[] = []
    for (const raw of meta.audienciaList) {
      const normalized = normalizeToken(raw)
      const resolved = AUDIENCE_ALIASES[normalized] ?? normalized
      if ((AUDIENCE_VALUES as readonly string[]).includes(resolved)) {
        audience.push(resolved)
        if (resolved !== raw) warnings.push(`Audiencia "${raw}" normalizada a "${resolved}".`)
      } else {
        invalid.push(raw)
      }
    }
    if (audience.length) data.audience = Array.from(new Set(audience))
    if (invalid.length)
      warnings.push(`Audiencia sin valor reconocido (ignorada): ${invalid.join(', ')}`)
  }

  if (meta.palabrasClaveList.length) data.tags = meta.palabrasClaveList

  if (meta.fecha) data.publishedAt = meta.fecha
  if (meta.fuentesList.length) data.sources = meta.fuentesList

  if (meta.tiempoLectura !== undefined) {
    const parsed = parseReadingTime(meta.tiempoLectura)
    if (parsed !== undefined) data.readingTime = parsed
    else warnings.push(`"tiempo_lectura" no es un número válido (${meta.tiempoLectura}).`)
  }
  if (data.readingTime === undefined) {
    const wordCount = content.split(/\s+/).filter(Boolean).length
    if (wordCount > 0) data.readingTime = Math.max(1, Math.round(wordCount / 200))
  }

  data.importMetadata = {
    ...meta.extra,
    titulo: meta.titulo,
    subtitulo: meta.subtitulo,
    fecha: meta.fecha,
    temas: meta.temasList,
    nivel: meta.nivel,
    alcance: meta.alcance,
    audiencia: meta.audienciaList,
    palabras_clave: meta.palabrasClaveList,
    descripcion: meta.descripcion,
    fuentes: meta.fuentesList,
    tiempo_lectura: meta.tiempoLectura,
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
  alcance?: string
  tiempoLectura?: string
  temasList: string[]
  audienciaList: string[]
  palabrasClaveList: string[]
  fuentesList: ParsedArticleSource[]
  extra: Record<string, string>
}

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
  let currentSource: Partial<ParsedArticleSource> | null = null

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
      case 'alcance':
        meta.alcance = unquote(value.trim())
        break
      case 'tiempo_lectura':
        meta.tiempoLectura = unquote(value.trim())
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
        if (value.trim()) meta.extra[key] = unquote(value.trim())
        break
    }
  }
  flushSource()

  return meta
}

function parseReadingTime(value: string): number | undefined {
  const match = value.match(/\d+([.,]\d+)?/)
  if (!match) return undefined
  const parsed = Number(match[0].replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    // Comillas internas escapadas (ej. `"...por qué no son \"rendirse\""`,
    // visto en varios .md del lote) — se desescapan, si no quedan
    // literalmente en el título/subtítulo/descripción.
    return trimmed.slice(1, -1).replace(/\\"/g, '"')
  }
  return trimmed
}

function fileNameToSlug(fileName: string | undefined): string | undefined {
  if (!fileName) return undefined
  return fileName.replace(/\.md$/i, '')
}
