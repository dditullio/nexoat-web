import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '@prisma/client'
import { AuthService } from './auth.service'
import { RequestSignupDto } from './dto/request-signup.dto'
import { CompleteSignupDto } from './dto/complete-signup.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { RefreshTokenGuard } from './guards/refresh-token.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { clearRefreshCookie, requestMeta, setRefreshCookie, toPublicUser } from './auth.utils'
import type { RefreshToken } from '@prisma/client'

// Límite estricto en login/register — mitigación de fuerza bruta y
// credential stuffing, encima del límite global de ThrottlerModule.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } }

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post('signup')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Paso 1 del alta por email — manda un link de activación',
    description:
      'Siempre responde { ok: true } sin importar si el email ya tiene cuenta — evita enumeración.',
  })
  async signup(@Body() dto: RequestSignupDto): Promise<{ ok: true }> {
    await this.authService.requestSignup(dto)
    return { ok: true }
  }

  @Throttle(AUTH_THROTTLE)
  @Post('signup/complete')
  @ApiOperation({
    summary: 'Paso 2 del alta por email — consume el token, activa la cuenta y abre sesión',
  })
  async completeSignup(
    @Body() dto: CompleteSignupDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const user = await this.authService.completeSignup(dto)
    return this.issueSession(user, req, res)
  }

  @Throttle(AUTH_THROTTLE)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login por email + contraseña' })
  async login(
    @CurrentUser() user: User,
    @Body() _dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    return this.issueSession(user, req, res)
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @ApiOperation({
    summary: 'Rota el refresh token (cookie httpOnly) y emite un access token nuevo',
  })
  async refresh(
    @Req() req: FastifyRequest & { refreshToken: RefreshToken & { user: User } },
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const { accessToken, refreshToken } = await this.authService.rotateRefreshToken(
      req.refreshToken,
      requestMeta(req)
    )
    setRefreshCookie(res, refreshToken)
    return { accessToken, user: toPublicUser(req.refreshToken.user) }
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoca el refresh token actual y limpia la cookie' })
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ): Promise<{ ok: true }> {
    const raw = req.cookies?.['nexoat_refresh_token']
    if (raw) await this.authService.revokeRefreshToken(raw)
    clearRefreshCookie(res)
    return { ok: true }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Usuario autenticado actual' })
  me(@CurrentUser() user: User) {
    return toPublicUser(user)
  }

  @Get('providers')
  @ApiOperation({
    summary: 'Qué proveedores OAuth están habilitados (para mostrar/ocultar botones)',
  })
  providers() {
    return this.authService.getProviders()
  }

  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Confirma el email con el token del link — no bloquea nada, es informativo',
  })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ ok: true }> {
    await this.authService.verifyEmail(dto.token)
    return { ok: true }
  }

  @Throttle(AUTH_THROTTLE)
  @UseGuards(JwtAuthGuard)
  @Post('verify-email/resend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reenvía el email de confirmación al usuario autenticado' })
  async resendVerification(@CurrentUser() user: User): Promise<{ ok: true }> {
    await this.authService.resendVerificationEmail(user)
    return { ok: true }
  }

  @Throttle(AUTH_THROTTLE)
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Pide el reset de contraseña',
    description:
      'Siempre responde { ok: true }, exista o no la cuenta — evita enumeración de emails.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ ok: true }> {
    await this.authService.requestPasswordReset(dto.email)
    return { ok: true }
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cambia la contraseña con el token del link — revoca todas las sesiones activas',
  })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ ok: true }> {
    await this.authService.resetPassword(dto.token, dto.password)
    return { ok: true }
  }

  private async issueSession(user: User, req: FastifyRequest, res: FastifyReply) {
    const { accessToken, refreshToken } = await this.authService.issueTokens(user, requestMeta(req))
    setRefreshCookie(res, refreshToken)
    return { accessToken, user: toPublicUser(user) }
  }
}
