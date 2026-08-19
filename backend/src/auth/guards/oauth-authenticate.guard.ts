import { Injectable, type ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { buildOAuthState, type OAuthContext } from '../auth.utils'

/**
 * Arma el `state` que viaja al proveedor OAuth (y vuelve intacto en el
 * callback) a partir de la query del request que inicia el flow:
 * `GET /auth/google?context=admin|reader&redirect=<path>`. Solo se usa en
 * la ruta de arranque (`auth()`), no en `/callback` — ese solo necesita
 * *leer* el `state`, no mandar nada. Ver auth.utils.ts (resolveOAuthRedirectUrl)
 * y docs/features/public-oauth-login.md.
 */
function stateFromRequest(context: ExecutionContext) {
  const req = context.switchToHttp().getRequest<FastifyRequest>()
  const query = req.query as Record<string, unknown>
  const oauthContext: OAuthContext = query.context === 'admin' ? 'admin' : 'reader'
  return { state: buildOAuthState(oauthContext, query.redirect) }
}

/**
 * Para redirigir al usuario al proveedor, `passport-oauth2` llama
 * `res.setHeader(...)`/`res.end()` directamente sobre el `response` que
 * `@nestjs/passport` le pasa — eso asume una respuesta al estilo Express.
 * `FastifyReply` no tiene esos métodos (Fastify usa `.header()`/`.send()`),
 * así que sin esto la ruta de arranque (`GET /auth/google`) revienta con
 * `TypeError: res.setHeader is not a function` apenas alguien hace clic en
 * "Continuar con Google". Se le pasa a Passport el `.raw` (el
 * `http.ServerResponse` de Node de siempre) y se llama `reply.hijack()`
 * para que Fastify no intente además serializar/enviar esa misma respuesta
 * por su cuenta. No hace falta en `/callback`: ahí Passport solo llama al
 * `validate()` de la estrategia y el controller responde con
 * `res.redirect()` de Fastify, sin pasar por `strategy.redirect()`.
 */
function getRawResponse(context: ExecutionContext) {
  const reply = context.switchToHttp().getResponse<FastifyReply>()
  reply.hijack()
  return reply.raw
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    return stateFromRequest(context)
  }

  getResponse(context: ExecutionContext) {
    return getRawResponse(context)
  }
}

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
  getAuthenticateOptions(context: ExecutionContext) {
    return stateFromRequest(context)
  }

  getResponse(context: ExecutionContext) {
    return getRawResponse(context)
  }
}
