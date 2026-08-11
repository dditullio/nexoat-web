import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '@prisma/client'
import { AuthService } from './auth.service'
import { requestMeta, setRefreshCookie } from './auth.utils'

// Solo se registra en AuthModule cuando GOOGLE_CLIENT_ID/SECRET existen —
// excluido de Swagger porque, cuando existe, es un flujo de redirect de
// navegador, no un endpoint JSON para probar desde /api/docs.
@ApiExcludeController()
@Controller('auth/google')
export class GoogleAuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(AuthGuard('google'))
  auth() {
    // Passport redirige a Google antes de llegar acá.
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async callback(@Req() req: FastifyRequest & { user: User }, @Res() res: FastifyReply) {
    const { user } = req
    const { refreshToken } = await this.authService.issueTokens(user, requestMeta(req))
    setRefreshCookie(res, refreshToken)
    // Sin access token en la URL (no queremos JWTs en logs/historial): el
    // frontend llama POST /auth/refresh apenas monta, usando ya la cookie
    // httpOnly que acabamos de setear, para obtener el access token.
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    res.redirect(`${frontendUrl}/nexoat-admin/oauth-callback`)
  }
}
