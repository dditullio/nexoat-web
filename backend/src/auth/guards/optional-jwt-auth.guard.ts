import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * Igual que `JwtAuthGuard`, pero nunca bloquea el request: si falta el
 * token, es inválido, o el usuario ya no está activo, deja `req.user` en
 * `undefined` en vez de lanzar 401. Se usa en endpoints públicos que quieren
 * saber "quién pregunta" (para decidir qué tanto contenido mostrar) sin
 * exigir sesión — ver `articles.controller.ts` y
 * docs/features/reader-accounts-and-paywall.md.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser | undefined {
    return user || undefined
  }
}
