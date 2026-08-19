import { Controller, Get, Req, Res, UseFilters, UseGuards } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '@prisma/client'
import { AuthService } from './auth.service'
import { requestMeta, resolveOAuthRedirectUrl, setRefreshCookie } from './auth.utils'
import { FacebookAuthGuard } from './guards/oauth-authenticate.guard'
import { OAuthErrorFilter } from './filters/oauth-error.filter'

// Solo se registra en AuthModule cuando FACEBOOK_CLIENT_ID/SECRET existen.
@ApiExcludeController()
@UseFilters(OAuthErrorFilter)
@Controller('auth/facebook')
export class FacebookAuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(FacebookAuthGuard)
  auth() {
    // Passport redirige a Facebook antes de llegar acá — ver GoogleAuthGuard,
    // mismo mecanismo de `state` (context/redirect) para Facebook.
  }

  @Get('callback')
  @UseGuards(AuthGuard('facebook'))
  async callback(
    @Req() req: FastifyRequest & { user: User; query: { state?: string } },
    @Res() res: FastifyReply
  ) {
    const { user } = req
    const { refreshToken } = await this.authService.issueTokens(user, requestMeta(req))
    setRefreshCookie(res, refreshToken)
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    // Ver el comentario equivalente en google-auth.controller.ts: el código
    // explícito (302) es obligatorio para que el navegador siga el redirect.
    res.redirect(resolveOAuthRedirectUrl(frontendUrl, req.query.state), 302)
  }
}
