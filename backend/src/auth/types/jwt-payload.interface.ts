import type { Role } from '@prisma/client'

/** Payload embebido en el access token (JWT de vida corta, 15 min). */
export interface JwtPayload {
  sub: string
  email: string
  role: Role
}
