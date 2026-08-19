import { Controller, Get, Req, Res, UseFilters, UseGuards } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '@prisma/client'
import { AuthService } from './auth.service'
import { requestMeta, resolveOAuthRedirectUrl, setRefreshCookie } from './auth.utils'
import { GoogleAuthGuard } from './guards/oauth-authenticate.guard'
import { OAuthErrorFilter } from './filters/oauth-error.filter'

// Solo se registra en AuthModule cuando GOOGLE_CLIENT_ID/SECRET existen —
// excluido de Swagger porque, cuando existe, es un flujo de redirect de
// navegador, no un endpoint JSON para probar desde /api/docs.
@ApiExcludeController()
@UseFilters(OAuthErrorFilter)
@Controller('auth/google')
export class GoogleAuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(GoogleAuthGuard)
  auth() {
    // Passport redirige a Google antes de llegar acá — GoogleAuthGuard ya
    // codificó `?context=admin|reader&redirect=...` de la query en el
    // `state` que Google va a devolver intacto en el callback.
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async callback(
    @Req() req: FastifyRequest & { user: User; query: { state?: string } },
    @Res() res: FastifyReply
  ) {
    const { user } = req
    const { refreshToken } = await this.authService.issueTokens(user, requestMeta(req))
    setRefreshCookie(res, refreshToken)
    // Sin access token en la URL (no queremos JWTs en logs/historial): la
    // landing (admin o lector, según el `state`) llama POST /auth/refresh
    // apenas monta, usando ya la cookie httpOnly que acabamos de setear.
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    // El código explícito (302) es obligatorio acá: si Nest ya dejó un status
    // implícito en la respuesta (pasa con @Res() en rutas GET), Fastify
    // reusa ese código en vez de 302 cuando `redirect()` no lo recibe — el
    // navegador nunca sigue un Location con un 200 y queda en blanco.
    res.redirect(resolveOAuthRedirectUrl(frontendUrl, req.query.state), 302)
  }
}
