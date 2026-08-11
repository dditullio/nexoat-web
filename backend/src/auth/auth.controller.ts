import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '@prisma/client'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
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
  @Post('register')
  @ApiOperation({ summary: 'Alta por email — crea un usuario con rol USER y abre sesión' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const user = await this.authService.register(dto)
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

  private async issueSession(user: User, req: FastifyRequest, res: FastifyReply) {
    const { accessToken, refreshToken } = await this.authService.issueTokens(user, requestMeta(req))
    setRefreshCookie(res, refreshToken)
    return { accessToken, user: toPublicUser(user) }
  }
}
