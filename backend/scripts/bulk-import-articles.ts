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

interface LoginResponse {
  accessToken: string
  user: { email: string; role: string }
}

async function login(apiUrl: string): Promise<string> {
  let email = process.env.BULK_IMPORT_EMAIL
  let password = process.env.BULK_IMPORT_PASSWORD
  if (!email) email = await prompt('Email (rol EDITOR o superior): ')
  if (!password) password = await prompt('Contraseña: ', true)

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

async function fetchKnownCategorySlugs(apiUrl: string): Promise<string[]> {
  const res = await fetch(`${apiUrl}/categories`)
  if (!res.ok) throw new Error(`No se pudieron leer las categorías (${res.status})`)
  const categories = (await res.json()) as { slug: string }[]
  return categories.map((c) => c.slug)
}

async function findMatchingImage(imagesDir: string, baseName: string): Promise<string | null> {
  const files = await readdir(imagesDir)
  const match = files.find((f) => {
    const ext = extname(f).toLowerCase()
    if (!IMAGE_EXTENSIONS.includes(ext)) return false
    return basename(f, extname(f)).toLowerCase() === baseName.toLowerCase()
  })
  return match ? join(imagesDir, match) : null
}

async function uploadImage(
  apiUrl: string,
  token: string,
  imagePath: string,
  attempt = 1
): Promise<{ url: string; publicId: string }> {
  try {
    const buffer = await readFile(imagePath)
    const ext = extname(imagePath).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
    const form = new FormData()
    form.append('file', new Blob([buffer], { type: mime }), basename(imagePath))

    const res = await fetch(`${apiUrl}/admin/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    if (!res.ok) throw new Error(`(${res.status}) ${await res.text()}`)
    return (await res.json()) as { url: string; publicId: string }
  } catch (err) {
    if (attempt < 2) return uploadImage(apiUrl, token, imagePath, attempt + 1)
    throw err
  }
}

interface CreateResult {
  status: 'created' | 'skipped' | 'error'
  file: string
  reason?: string
}

async function createArticle(
  apiUrl: string,
  token: string,
  data: ParsedArticleData & { coverImage?: string; coverImagePublicId?: string }
): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const res = await fetch(`${apiUrl}/admin/articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...data, status: 'publicado' }),
  })
  if (res.ok) return { ok: true }
  return { ok: false, status: res.status, body: await res.text() }
}

async function main() {
  const { articlesDir, imagesDir, apiUrl } = parseArgs()

  console.log(`API: ${apiUrl}`)
  const token = await login(apiUrl)
  console.log('Sesión iniciada.\n')

  const knownCategorySlugs = await fetchKnownCategorySlugs(apiUrl)

  const files = (await readdir(articlesDir)).filter((f) => f.toLowerCase().endsWith('.md'))
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
    const { data, warnings } = parseArticleMarkdown(raw, knownCategorySlugs, file)

    if (warnings.length) {
      console.log(`⚠ ${file}`)
      for (const w of warnings) console.log(`   - ${w}`)
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
    let coverImage: string | undefined
    let coverImagePublicId: string | undefined
    const imagePath = await findMatchingImage(imagesDir, baseName)
    if (!imagePath) {
      missingCovers.push(file)
    } else {
      try {
        const uploaded = await uploadImage(apiUrl, token, imagePath)
        coverImage = uploaded.url
        coverImagePublicId = uploaded.publicId
      } catch (err) {
        missingCovers.push(`${file} (falló la subida: ${(err as Error).message})`)
      }
    }

    const creation = await createArticle(apiUrl, token, {
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
        results.push({ status: 'skipped', file, reason: 'ya existe (slug duplicado)' })
        console.log(`↷ ${file} → ya existe, salteado`)
      } else {
        results.push({ status: 'error', file, reason: `(${status}) ${body}` })
        console.log(`✗ ${file} → error: (${status}) ${body}`)
      }
    }
  }

  const created = results.filter((r) => r.status === 'created').length
  const skipped = results.filter((r) => r.status === 'skipped')
  const errors = results.filter((r) => r.status === 'error')

  console.log('\n──────── Resumen ────────')
  console.log(`Creados: ${created}`)
  console.log(`Salteados: ${skipped.length}`)
  for (const s of skipped) console.log(`   - ${s.file}: ${s.reason}`)
  console.log(`Errores: ${errors.length}`)
  for (const e of errors) console.log(`   - ${e.file}: ${e.reason}`)
  console.log(`Sin portada: ${missingCovers.length}`)
  for (const m of missingCovers) console.log(`   - ${m}`)
}

main().catch((err) => {
  console.error('\nError fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
