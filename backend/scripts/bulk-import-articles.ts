/**
 * Carga masiva de artículos desde una carpeta de .md + una carpeta de
 * imágenes de portada, contra la API HTTP real (mismo camino que usa el
 * panel admin). Ver docs/features/bulk-article-import-script.md.
 *
 * Uso:
 *   pnpm --filter @nexoat/backend import:bulk -- \
 *     --articles "ruta/a/Publicables" --images "ruta/a/Imágenes Publicables" \
 *     [--api http://localhost:3001/v1]
 *
 * Credenciales por env var (no por flag, para no dejarlas en el historial
 * de la shell): BULK_IMPORT_EMAIL / BULK_IMPORT_PASSWORD. Si faltan, se
 * piden interactivamente.
 */
import { createInterface } from 'node:readline'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join, basename } from 'node:path'
import { parseArticleMarkdown, type ParsedArticleData } from './lib/parseArticleMarkdown'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

// Alias manuales de "temas" del .md a slugs de categoría real, para los
// casos ya identificados donde el nombre del tema no coincide con el slug
// de la categoría existente pero se refiere claramente a la misma cosa.
// Ver docs/features/bulk-article-import-script.md.
const CATEGORY_ALIASES: Record<string, string> = {
  'maltrato-invisible': 'maltrato-y-abuso',
}

// Pausa mínima entre requests autenticados, para no reventar el límite
// global del ThrottlerModule (100 req/60s, ver backend/src/app.module.ts).
// Con ~2 requests por artículo (subida + creación), 400ms deja margen de
// sobra sin volver el lote insoportablemente lento.
const REQUEST_PACING_MS = 400

interface Args {
  articlesDir: string
  imagesDir: string
  apiUrl: string
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (flag: string) => {
    const i = argv.indexOf(flag)
    return i === -1 ? undefined : argv[i + 1]
  }
  const articlesDir = get('--articles')
  const imagesDir = get('--images')
  const apiUrl = get('--api') ?? 'http://localhost:3001/v1'
  if (!articlesDir || !imagesDir) {
    console.error(
      'Uso: pnpm --filter @nexoat/backend import:bulk -- --articles <carpeta .md> --images <carpeta imágenes> [--api <url>]'
    )
    process.exit(1)
  }
  return { articlesDir, imagesDir, apiUrl }
}

function prompt(question: string, hide = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    if (hide) {
      // API interna de readline, sin tipos públicos — truco estándar para
      // no eco-ar la contraseña en la terminal.
      const rlInternal = rl as unknown as { output: NodeJS.WritableStream }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(rl as any)._writeToOutput = (str: string) => {
        if (str.includes('\n')) rlInternal.output.write('\n')
      }
    }
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface LoginResponse {
  accessToken: string
  user: { email: string; role: string }
}

/**
 * Credenciales guardadas para poder volver a loguear cuando el access
 * token (15 min de vida, ver auth.service.ts) expira a mitad de un lote
 * largo. `token` es mutable — la sesión completa la comparte por
 * referencia, así que renovarlo acá alcanza para todo el resto del run.
 */
interface Session {
  apiUrl: string
  email: string
  password: string
  token: string
}

async function login(apiUrl: string, email: string, password: string): Promise<string> {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error(`Login falló (${res.status}): ${await res.text()}`)
  }
  const data = (await res.json()) as LoginResponse
  if (!['EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes(data.user.role)) {
    throw new Error(
      `El usuario "${email}" tiene rol "${data.user.role}" — necesita EDITOR o superior.`
    )
  }
  return data.accessToken
}

async function initSession(apiUrl: string): Promise<Session> {
  let email = process.env.BULK_IMPORT_EMAIL
  let password = process.env.BULK_IMPORT_PASSWORD
  if (!email) email = await prompt('Email (rol EDITOR o superior): ')
  if (!password) password = await prompt('Contraseña: ', true)
  const token = await login(apiUrl, email, password)
  return { apiUrl, email, password, token }
}

/**
 * Wrapper de fetch autenticado con dos redes de seguridad, necesarias en
 * cualquier corrida de más de ~15 minutos (el lote completo tarda bastante
 * más que eso entre compresión de imágenes y creación de artículos):
 *
 * - 401 (access token vencido a mitad de corrida): re-loguea una vez con
 *   las mismas credenciales y reintenta la request con el token nuevo.
 * - 429 (ThrottlerException, límite global de la API): espera según
 *   "Retry-After" si vino, si no backoff exponencial, y reintenta hasta 5
 *   veces — el lote es grande, un 429 puntual no debería tirar artículos
 *   a la pila de errores cuando el problema es solo de ritmo.
 *
 * Además espeja SIEMPRE `REQUEST_PACING_MS` antes de la request para no
 * depender únicamente de los reintentos.
 */
async function authedFetch(
  session: Session,
  path: string,
  init: RequestInit,
  attempt = 1
): Promise<Response> {
  await sleep(REQUEST_PACING_MS)

  let res: Response
  try {
    res = await fetch(`${session.apiUrl}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${session.token}` },
    })
  } catch (err) {
    // Corte de conexión a nivel de red (ECONNRESET, etc.) — no es una
    // respuesta HTTP, así que no cae en los checks de status de abajo.
    // Mismo backoff que 429, hasta 5 reintentos.
    if (attempt > 5) throw err
    await sleep(1000 * 2 ** (attempt - 1))
    return authedFetch(session, path, init, attempt + 1)
  }

  if (res.status === 401 && attempt === 1) {
    session.token = await login(session.apiUrl, session.email, session.password)
    return authedFetch(session, path, init, attempt + 1)
  }

  if (res.status === 429 && attempt <= 5) {
    const retryAfterHeader = res.headers.get('retry-after')
    const waitMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 1000 * 2 ** (attempt - 1)
    await sleep(waitMs)
    return authedFetch(session, path, init, attempt + 1)
  }

  return res
}

async function fetchKnownCategorySlugs(apiUrl: string): Promise<string[]> {
  const res = await fetch(`${apiUrl}/categories`)
  if (!res.ok) throw new Error(`No se pudieron leer las categorías (${res.status})`)
  const categories = (await res.json()) as { slug: string }[]
  return categories.map((c) => c.slug)
}

interface ExistingArticle {
  id: string
  hasCoverImage: boolean
}

/**
 * Listado completo (paginado) de artículos ya existentes, por slug — se usa
 * para dos cosas: no repetir el baile de "crear y recibir 409" cuando ya
 * sabemos que existe, y para el caso de re-correr el import sobre un lote
 * ya cargado donde solo cambió qué imágenes están disponibles: si el
 * artículo existe pero no tiene portada y ahora sí hay una imagen que
 * matchea, se la sube y actualiza sin tocar el resto del artículo.
 */
async function fetchExistingArticles(session: Session): Promise<Map<string, ExistingArticle>> {
  const bySlug = new Map<string, ExistingArticle>()
  for (let page = 1; ; page++) {
    const res = await authedFetch(session, `/admin/articles?page=${page}&pageSize=50`, {})
    if (!res.ok) throw new Error(`No se pudo listar artículos existentes (${res.status})`)
    const data = (await res.json()) as {
      items: { id: string; slug: string; coverImage: string | null }[]
      total: number
    }
    for (const item of data.items) {
      bySlug.set(item.slug, { id: item.id, hasCoverImage: Boolean(item.coverImage) })
    }
    if (page * 50 >= data.total) break
  }
  return bySlug
}

async function updateArticleCoverImage(
  session: Session,
  id: string,
  coverImage: string,
  coverImagePublicId: string
): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const res = await authedFetch(session, `/admin/articles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coverImage, coverImagePublicId }),
  })
  if (res.ok) return { ok: true }
  return { ok: false, status: res.status, body: await res.text() }
}

// Las imágenes de portada generadas en lote llevan un sufijo de fecha
// pegado al nombre del artículo (ej. "mi-articulo_202608140912.jpeg", de
// nexoat-lote-imagenes-portada) — se matchea por nombre exacto o por
// "empieza con {baseName}_" seguido solo de dígitos antes de la extensión.
async function findMatchingImage(imagesDir: string, baseName: string): Promise<string | null> {
  const files = await readdir(imagesDir)
  const target = baseName.toLowerCase()
  const match = files.find((f) => {
    const ext = extname(f).toLowerCase()
    if (!IMAGE_EXTENSIONS.includes(ext)) return false
    const stem = basename(f, extname(f)).toLowerCase()
    if (stem === target) return true
    if (!stem.startsWith(`${target}_`)) return false
    return /^\d+$/.test(stem.slice(target.length + 1))
  })
  return match ? join(imagesDir, match) : null
}

async function uploadImage(
  session: Session,
  imagePath: string
): Promise<{ url: string; publicId: string }> {
  const buffer = await readFile(imagePath)
  const ext = extname(imagePath).toLowerCase()
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mime }), basename(imagePath))

  const res = await authedFetch(session, '/admin/media', { method: 'POST', body: form })
  if (!res.ok) throw new Error(`(${res.status}) ${await res.text()}`)
  return (await res.json()) as { url: string; publicId: string }
}

interface CreateResult {
  status: 'created' | 'updated' | 'skipped' | 'error'
  file: string
  reason?: string
}

async function createArticle(
  session: Session,
  data: ParsedArticleData & { coverImage?: string; coverImagePublicId?: string }
): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const res = await authedFetch(session, '/admin/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, status: 'publicado' }),
  })
  if (res.ok) return { ok: true }
  return { ok: false, status: res.status, body: await res.text() }
}

async function main() {
  const { articlesDir, imagesDir, apiUrl } = parseArgs()

  console.log(`API: ${apiUrl}`)
  const session = await initSession(apiUrl)
  console.log('Sesión iniciada.\n')

  const knownCategorySlugs = await fetchKnownCategorySlugs(apiUrl)
  const existingArticles = await fetchExistingArticles(session)
  console.log(`${existingArticles.size} artículo(s) ya existentes en el destino.\n`)

  // Archivos que empiezan con "_" son auxiliares del lote (ej.
  // "_prompts_portadas.md", "_progreso.json" del flujo de
  // nexoat-lote-imagenes-portada), no artículos.
  const files = (await readdir(articlesDir)).filter(
    (f) => f.toLowerCase().endsWith('.md') && !f.startsWith('_')
  )
  if (files.length === 0) {
    console.log('No se encontraron archivos .md en la carpeta indicada.')
    return
  }
  console.log(`${files.length} artículo(s) a procesar.\n`)

  const results: CreateResult[] = []
  const missingCovers: string[] = []

  for (const file of files) {
    const filePath = join(articlesDir, file)
    const raw = await readFile(filePath, 'utf-8')
    const { data, unknownCategorySlugs, warnings } = parseArticleMarkdown(
      raw,
      knownCategorySlugs,
      file
    )

    // Resuelve alias conocidos (ej. "maltrato-invisible" → "maltrato-y-abuso")
    // antes de reportar como "sin categoría equivalente".
    const stillUnknown: string[] = []
    for (const slug of unknownCategorySlugs) {
      const alias = CATEGORY_ALIASES[slug]
      if (alias && knownCategorySlugs.includes(alias)) {
        data.categorySlugs = Array.from(new Set([...(data.categorySlugs ?? []), alias]))
      } else {
        stillUnknown.push(slug)
      }
    }
    const displayWarnings = warnings.filter((w) => !w.startsWith('Temas sin categoría'))
    if (stillUnknown.length) {
      displayWarnings.push(
        `Temas sin categoría equivalente (no se marcaron): ${stillUnknown.join(', ')}`
      )
    }

    if (displayWarnings.length) {
      console.log(`⚠ ${file}`)
      for (const w of displayWarnings) console.log(`   - ${w}`)
    }

    if (!data.title) {
      results.push({ status: 'skipped', file, reason: 'sin título' })
      continue
    }
    if (!data.categorySlugs?.length) {
      results.push({ status: 'skipped', file, reason: 'ninguna categoría reconocida' })
      continue
    }
    if (!data.level) {
      results.push({ status: 'skipped', file, reason: 'nivel faltante o inválido' })
      continue
    }
    if (!data.audience?.length) {
      results.push({ status: 'skipped', file, reason: 'audiencia faltante o inválida' })
      continue
    }

    const baseName = basename(file, '.md')
    const existing = data.slug ? existingArticles.get(data.slug) : undefined

    // Ya existe y ya tiene portada: nada que hacer, es el caso normal de
    // re-correr el import sobre un lote ya cargado.
    if (existing?.hasCoverImage) {
      results.push({ status: 'skipped', file, reason: 'ya existe (slug duplicado)' })
      console.log(`↷ ${file} → ya existe, salteado`)
      continue
    }

    // Ya existe pero sin portada: solo intenta agregarle la imagen si ahora
    // hay una que matchea — no toca título/contenido/categorías de un
    // artículo que ya está publicado.
    if (existing && !existing.hasCoverImage) {
      const imagePath = await findMatchingImage(imagesDir, baseName)
      if (!imagePath) {
        results.push({ status: 'skipped', file, reason: 'ya existe, sigue sin portada disponible' })
        console.log(`↷ ${file} → ya existe, sin portada nueva disponible`)
        continue
      }
      try {
        const uploaded = await uploadImage(session, imagePath)
        const patch = await updateArticleCoverImage(
          session,
          existing.id,
          uploaded.url,
          uploaded.publicId
        )
        if (patch.ok) {
          results.push({ status: 'updated', file })
          console.log(`✓ ${file} → portada agregada`)
        } else {
          results.push({
            status: 'error',
            file,
            reason: `PATCH portada falló (${patch.status}) ${patch.body}`,
          })
          console.log(`✗ ${file} → error al actualizar portada: (${patch.status}) ${patch.body}`)
        }
      } catch (err) {
        results.push({
          status: 'error',
          file,
          reason: `falló la subida de portada: ${(err as Error).message}`,
        })
        console.log(`✗ ${file} → falló la subida de portada: ${(err as Error).message}`)
      }
      continue
    }

    // No existe todavía: flujo normal de creación.
    let coverImage: string | undefined
    let coverImagePublicId: string | undefined
    const imagePath = await findMatchingImage(imagesDir, baseName)
    if (!imagePath) {
      missingCovers.push(file)
    } else {
      try {
        const uploaded = await uploadImage(session, imagePath)
        coverImage = uploaded.url
        coverImagePublicId = uploaded.publicId
      } catch (err) {
        missingCovers.push(`${file} (falló la subida: ${(err as Error).message})`)
      }
    }

    const creation = await createArticle(session, {
      ...data,
      coverImage,
      coverImagePublicId,
    } as ParsedArticleData & { coverImage?: string; coverImagePublicId?: string })

    if (creation.ok) {
      results.push({ status: 'created', file })
      console.log(`✓ ${file} → creado`)
    } else {
      const { status, body } = creation
      if (status === 409) {
        // No debería pasar (ya lo filtramos con existingArticles arriba),
        // pero por si el listado quedó desactualizado durante una corrida
        // muy larga, mismo tratamiento que antes: no romper el lote.
        results.push({ status: 'skipped', file, reason: 'ya existe (slug duplicado)' })
        console.log(`↷ ${file} → ya existe, salteado`)
      } else {
        results.push({ status: 'error', file, reason: `(${status}) ${body}` })
        console.log(`✗ ${file} → error: (${status}) ${body}`)
      }
    }
  }

  const created = results.filter((r) => r.status === 'created').length
  const updated = results.filter((r) => r.status === 'updated').length
  const skipped = results.filter((r) => r.status === 'skipped')
  const errors = results.filter((r) => r.status === 'error')

  console.log('\n──────── Resumen ────────')
  console.log(`Creados: ${created}`)
  console.log(`Portadas agregadas a artículos existentes: ${updated}`)
  console.log(`Salteados: ${skipped.length}`)
  for (const s of skipped) console.log(`   - ${s.file}: ${s.reason}`)
  console.log(`Errores: ${errors.length}`)
  for (const e of errors) console.log(`   - ${e.file}: ${e.reason}`)
  console.log(`Sin portada (artículos nuevos creados sin imagen): ${missingCovers.length}`)
  for (const m of missingCovers) console.log(`   - ${m}`)
}

main().catch((err) => {
  console.error('\nError fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
