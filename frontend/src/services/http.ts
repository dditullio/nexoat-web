// Wrapper sobre fetch nativo — sin sumar axios como dependencia (ver
// docs/features/auth-and-admin-dashboard.md). `useAuthStore` se importa acá
// y `stores/auth.ts` importa `http` de acá: es una dependencia circular de
// módulos ES intencional y segura, porque ninguno de los dos usa el import
// del otro al evaluarse — solo dentro de funciones que corren después.
import { useAuthStore } from '@/stores/auth'

const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(extractMessage(body) ?? `Error ${status}`)
    this.name = 'ApiError'
  }
}

function extractMessage(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown }
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.join(', ')
  }
  return undefined
}

export interface HttpOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** No reintentar tras un 401 — usado por los propios endpoints de /auth para no loopear. */
  skipAuthRetry?: boolean
}

async function rawFetch(path: string, options: HttpOptions): Promise<Response> {
  const authStore = useAuthStore()
  const headers = new Headers(options.headers)
  const isFormData = options.body instanceof FormData

  if (!isFormData && options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  if (authStore.accessToken) {
    headers.set('Authorization', `Bearer ${authStore.accessToken}`)
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    // El refresh token viaja como cookie httpOnly — necesaria en cada
    // request a /auth/refresh y /auth/logout.
    credentials: 'include',
    body: isFormData
      ? (options.body as BodyInit)
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  })
}

/**
 * Ante un 401 (access token vencido) dispara `authStore.refresh()` una vez
 * y reintenta la request original — silent refresh vía la cookie httpOnly.
 * Lanza `ApiError` si la respuesta final no es ok.
 */
async function request(path: string, options: HttpOptions): Promise<Response> {
  let res = await rawFetch(path, options)

  if (res.status === 401 && !options.skipAuthRetry) {
    const authStore = useAuthStore()
    const refreshed = await authStore.refresh()
    if (refreshed) {
      res = await rawFetch(path, options)
    }
  }

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      // sin body JSON (ej. 204 o error de red del proxy) — se deja undefined
    }
    throw new ApiError(res.status, body)
  }

  return res
}

export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const res = await request(path, options)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/**
 * Igual que `http` pero devuelve el cuerpo crudo — para descargas de
 * archivos (ej. el zip de un respaldo), que necesitan el header
 * `Authorization` y por eso no pueden ser un `<a href>` pelado.
 */
export async function httpBlob(path: string, options: HttpOptions = {}): Promise<Blob> {
  const res = await request(path, options)
  return res.blob()
}

/** Serializa un objeto plano como querystring, salteando undefined/null/''. */
export function toQueryString<T extends object>(params: T): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
