import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '@prisma/client'
import { AuthService } from './auth.service'
import { requestMeta, setRefreshCookie } from './auth.utils'

// Solo se registra en AuthModule cuando FACEBOOK_CLIENT_ID/SECRET existen.
@ApiExcludeController()
@Controller('auth/facebook')
export class FacebookAuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(AuthGuard('facebook'))
  auth() {
    // Passport redirige a Facebook antes de llegar acá.
  }

  @Get('callback')
  @UseGuards(AuthGuard('facebook'))
  async callback(@Req() req: FastifyRequest & { user: User }, @Res() res: FastifyReply) {
    const { user } = req
    const { refreshToken } = await this.authService.issueTokens(user, requestMeta(req))
    setRefreshCookie(res, refreshToken)
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    res.redirect(`${frontendUrl}/nexoat-admin/oauth-callback`)
  }
}
