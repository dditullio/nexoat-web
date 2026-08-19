import type { FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '@prisma/client'

/**
 * El refresh token viaja como cookie httpOnly con el `path` acotado a
 * `/v1/auth` (no a todo el sitio): cubre `/auth/refresh` y `/auth/logout`,
 * que son los únicos endpoints que necesitan leerla — defensa en
 * profundidad, la cookie no viaja en el resto de los requests.
 */
export const REFRESH_COOKIE_NAME = 'nexoat_refresh_token'
export const REFRESH_COOKIE_PATH = '/v1/auth'
const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export function setRefreshCookie(res: FastifyReply, token: string) {
  res.setCookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  })
}

export function clearRefreshCookie(res: FastifyReply) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH })
}

export function requestMeta(req: FastifyRequest) {
  return { userAgent: req.headers['user-agent'], ip: req.ip }
}

/**
 * A qué landing de callback vuelve el flujo de OAuth: el admin
 * (`/nexoat-admin/oauth-callback`) o un lector público (`/oauth-callback`).
 * Viaja de ida (`buildOAuthState`, al armar el link "Continuar con Google")
 * y de vuelta (`resolveOAuthRedirectUrl`, en el callback) dentro del `state`
 * que el proveedor OAuth devuelve intacto — no requiere sesión ni guardar
 * nada en DB. Ver docs/features/public-oauth-login.md.
 */
export type OAuthContext = 'admin' | 'reader'

/** Evita open-redirect: solo paths relativos propios, nunca URLs absolutas ni protocol-relative (`//host/...`). */
export function isSafeRedirectPath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('://')
  )
}

export function buildOAuthState(context: OAuthContext, redirect: unknown): string {
  return JSON.stringify({
    context,
    redirect: isSafeRedirectPath(redirect) ? redirect : undefined,
  })
}

function parseOAuthState(rawState: unknown): { context: OAuthContext; redirect?: string } {
  let context: OAuthContext = 'reader'
  let redirect: string | undefined

  if (typeof rawState === 'string') {
    try {
      const parsed: unknown = JSON.parse(rawState)
      if (parsed && typeof parsed === 'object') {
        const { context: parsedContext, redirect: parsedRedirect } = parsed as Record<
          string,
          unknown
        >
        if (parsedContext === 'admin') context = 'admin'
        if (isSafeRedirectPath(parsedRedirect)) redirect = parsedRedirect
      }
    } catch {
      // state ausente/corrupto → default seguro (reader, sin redirect)
    }
  }

  return { context, redirect }
}

export function resolveOAuthRedirectUrl(frontendUrl: string, rawState: unknown): string {
  const { context, redirect } = parseOAuthState(rawState)
  const base = context === 'admin' ? '/nexoat-admin/oauth-callback' : '/oauth-callback'
  const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
  return `${frontendUrl}${base}${query}`
}

/**
 * A dónde volver cuando el intercambio del código OAuth falla (código
 * inválido/expirado, el usuario negó el consentimiento, el proveedor no
 * expuso el email, etc.) — pasa siempre por acá vía `OAuthErrorFilter`, ver
 * guards/oauth-authenticate.guard.ts. Vuelve al login (no al callback) de
 * la superficie que corresponda, con `?error=oauth` para que la pantalla
 * muestre un aviso en vez de quedar en blanco.
 */
export function resolveOAuthErrorRedirectUrl(frontendUrl: string, rawState: unknown): string {
  const { context } = parseOAuthState(rawState)
  const base = context === 'admin' ? '/nexoat-admin/login' : '/ingresar'
  return `${frontendUrl}${base}?error=oauth`
}

/** Nunca devolver `passwordHash` al cliente, ni siquiera al propio usuario. */
export function toPublicUser(user: User) {
  const publicUser: Partial<User> = { ...user }
  delete publicUser.passwordHash
  return publicUser
}
