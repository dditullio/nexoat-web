/**
 * Actualiza el `scope` (alcance) de un lote de artículos ya publicados,
 * contra la API HTTP real (mismo camino que usa el panel admin) — no toca
 * la DB directo, así que corre igual desde cualquier máquina que tenga red
 * hacia la API, sin necesitar Prisma ni herramientas de desarrollo del lado
 * del servidor. Ver docs/features/bulk-article-import-script.md para el
 * precedente (mismo patrón que `bulk-import-articles.ts`).
 *
 * Entrada: un CSV con columnas `slug,corpus,puntaje,alcance_anterior,alcance_nuevo`
 * (ver tmp/alcance_actualizado.csv).
 *
 * Seguridad: por cada fila, solo hace PATCH si el `scope` actual del
 * artículo (según `GET /admin/articles`) coincide con `alcance_anterior`
 * del CSV. Si un editor ya cambió el alcance a mano después de generar el
 * CSV, la fila se saltea y se avisa — nunca pisa un ajuste manual más
 * reciente. Slugs que no existen en el destino también se listan aparte,
 * no rompen el resto del lote.
 *
 * Uso:
 *   pnpm --filter @nexoat/backend update:scopes -- \
 *     --csv "ruta/a/alcance_actualizado.csv" [--api http://localhost:3001/v1]
 *
 * Credenciales por env var (no por flag, para no dejarlas en el historial
 * de la shell): UPDATE_SCOPES_EMAIL / UPDATE_SCOPES_PASSWORD. Si faltan, se
 * piden interactivamente.
 */
import { createInterface } from 'node:readline'
import { readFile } from 'node:fs/promises'

const VALID_SCOPES = [
  'publico',
  'suscriptores_nivel_1',
  'suscriptores_nivel_2',
  'suscriptores_nivel_3',
]

// Mismo ritmo que bulk-import-articles.ts — no reventar el límite global
// del ThrottlerModule (100 req/60s, ver backend/src/app.module.ts).
const REQUEST_PACING_MS = 400

interface Args {
  csvPath: string
  apiUrl: string
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (flag: string) => {
    const i = argv.indexOf(flag)
    return i === -1 ? undefined : argv[i + 1]
  }
  const csvPath = get('--csv')
  const apiUrl = get('--api') ?? 'http://localhost:3001/v1'
  if (!csvPath) {
    console.error(
      'Uso: pnpm --filter @nexoat/backend update:scopes -- --csv <ruta.csv> [--api <url>]'
    )
    process.exit(1)
  }
  return { csvPath, apiUrl }
}

function prompt(question: string, hide = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    if (hide) {
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
  let email = process.env.UPDATE_SCOPES_EMAIL
  let password = process.env.UPDATE_SCOPES_PASSWORD
  if (!email) email = await prompt('Email (rol EDITOR o superior): ')
  if (!password) password = await prompt('Contraseña: ', true)
  const token = await login(apiUrl, email, password)
  return { apiUrl, email, password, token }
}

/** Mismas dos redes de seguridad que bulk-import-articles.ts: 401 → re-login
 * y reintento; 429 → backoff (Retry-After o exponencial), hasta 5 intentos. */
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

interface CsvRow {
  slug: string
  puntaje: number
  alcanceAnterior: string
  alcanceNuevo: string
}

function parseCsv(raw: string): CsvRow[] {
  const [header, ...lines] = raw.trim().split(/\r?\n/)
  const cols = header.split(',')
  const idx = (name: string) => {
    const i = cols.indexOf(name)
    if (i === -1) throw new Error(`Columna "${name}" no encontrada en el CSV (header: ${header})`)
    return i
  }
  const slugIdx = idx('slug')
  const puntajeIdx = idx('puntaje')
  const anteriorIdx = idx('alcance_anterior')
  const nuevoIdx = idx('alcance_nuevo')

  return lines
    .filter((l) => l.trim() !== '')
    .map((line) => {
      const parts = line.split(',')
      return {
        slug: parts[slugIdx].trim(),
        puntaje: Number(parts[puntajeIdx]),
        alcanceAnterior: parts[anteriorIdx].trim(),
        alcanceNuevo: parts[nuevoIdx].trim(),
      }
    })
}

interface ExistingArticle {
  id: string
  scope: string
}

/** Listado completo (paginado) de artículos existentes en el destino, por
 * slug, con su `scope` actual — mismo patrón que fetchExistingArticles de
 * bulk-import-articles.ts. */
async function fetchExistingArticles(session: Session): Promise<Map<string, ExistingArticle>> {
  const bySlug = new Map<string, ExistingArticle>()
  for (let page = 1; ; page++) {
    const res = await authedFetch(session, `/admin/articles?page=${page}&pageSize=50`, {})
    if (!res.ok) throw new Error(`No se pudo listar artículos existentes (${res.status})`)
    const data = (await res.json()) as {
      items: { id: string; slug: string; scope: string }[]
      total: number
    }
    for (const item of data.items) {
      bySlug.set(item.slug, { id: item.id, scope: item.scope })
    }
    if (page * 50 >= data.total) break
  }
  return bySlug
}

async function patchScope(
  session: Session,
  id: string,
  scope: string
): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const res = await authedFetch(session, `/admin/articles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope }),
  })
  if (res.ok) return { ok: true }
  return { ok: false, status: res.status, body: await res.text() }
}

async function main() {
  const { csvPath, apiUrl } = parseArgs()

  const raw = await readFile(csvPath, 'utf-8')
  const rows = parseCsv(raw)
  const invalidScope = rows.find(
    (r) => !VALID_SCOPES.includes(r.alcanceNuevo) || !VALID_SCOPES.includes(r.alcanceAnterior)
  )
  if (invalidScope) {
    throw new Error(
      `Fila con alcance no reconocido (${invalidScope.slug}): "${invalidScope.alcanceAnterior}" → "${invalidScope.alcanceNuevo}". Valores válidos: ${VALID_SCOPES.join(', ')}`
    )
  }
  console.log(`${rows.length} fila(s) en el CSV.\n`)

  console.log(`API: ${apiUrl}`)
  const session = await initSession(apiUrl)
  console.log('Sesión iniciada.\n')

  const existing = await fetchExistingArticles(session)
  console.log(`${existing.size} artículo(s) en el destino.\n`)

  let updated = 0
  let skippedSame = 0
  const notFound: string[] = []
  const mismatched: { slug: string; actual: string; esperado: string }[] = []
  const errors: { slug: string; reason: string }[] = []

  for (const row of rows) {
    const article = existing.get(row.slug)

    if (!article) {
      notFound.push(row.slug)
      continue
    }

    if (article.scope === row.alcanceNuevo) {
      skippedSame++
      continue
    }

    if (article.scope !== row.alcanceAnterior) {
      mismatched.push({ slug: row.slug, actual: article.scope, esperado: row.alcanceAnterior })
      continue
    }

    const result = await patchScope(session, article.id, row.alcanceNuevo)
    if (result.ok) {
      console.log(
        `  ✔ ${row.slug}: ${article.scope} → ${row.alcanceNuevo} (puntaje ${row.puntaje})`
      )
      updated++
    } else {
      errors.push({ slug: row.slug, reason: `(${result.status}) ${result.body}` })
      console.log(`  ✗ ${row.slug} → error: (${result.status}) ${result.body}`)
    }
  }

  console.log('\n──────── Resumen ────────')
  console.log(`Actualizados: ${updated}`)
  console.log(`Ya tenían el alcance nuevo (sin cambios): ${skippedSame}`)
  if (mismatched.length) {
    console.log(
      `⚠ ${mismatched.length} saltados por no coincidir con "alcance_anterior" (probable edición manual posterior):`
    )
    mismatched.forEach((m) =>
      console.log(`   - ${m.slug}: destino tiene "${m.actual}", CSV esperaba "${m.esperado}"`)
    )
  }
  if (notFound.length) {
    console.log(`⚠ ${notFound.length} slugs del CSV no existen en el destino:`)
    notFound.forEach((s) => console.log(`   - ${s}`))
  }
  if (errors.length) {
    console.log(`✗ ${errors.length} errores de API:`)
    errors.forEach((e) => console.log(`   - ${e.slug}: ${e.reason}`))
  }
}

main().catch((err) => {
  console.error('\nError fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
