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

/** Nunca devolver `passwordHash` al cliente, ni siquiera al propio usuario. */
export function toPublicUser(user: User) {
  const publicUser: Partial<User> = { ...user }
  delete publicUser.passwordHash
  return publicUser
}
