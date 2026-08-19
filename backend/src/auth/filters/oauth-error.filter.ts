import { Catch, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { resolveOAuthErrorRedirectUrl } from '../auth.utils'

/**
 * Cualquier falla del intercambio OAuth (code inválido/expirado, el usuario
 * negó el consentimiento, el proveedor no expuso el email, etc.) explota
 * dentro del guard de Passport (`AuthGuard('google'|'facebook')`), *antes*
 * de que el controller llegue a correr — un `try/catch` ahí no la agarra.
 * Sin este filter, el navegador queda parado en la URL del callback del
 * backend mostrando el JSON 500 crudo de Nest. Con él, vuelve al login
 * correspondiente (admin o lector, según el `state`) con `?error=oauth`
 * para que la pantalla muestre un aviso. Ver docs/features/public-oauth-login.md.
 */
@Catch()
export class OAuthErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('OAuthErrorFilter')

  catch(exception: unknown, host: ArgumentsHost) {
    this.logger.error(
      'Falló el flujo de OAuth',
      exception instanceof Error ? exception.stack : String(exception)
    )

    const req = host.switchToHttp().getRequest<FastifyRequest>()
    const res = host.switchToHttp().getResponse<FastifyReply>()
    const state = (req.query as Record<string, unknown> | undefined)?.state
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    // Código explícito (302) — ver el comentario en google-auth.controller.ts:
    // sin él, Fastify puede reusar un status implícito de 200 y el navegador
    // nunca sigue el Location.
    res.redirect(resolveOAuthErrorRedirectUrl(frontendUrl, state), 302)
  }
}
