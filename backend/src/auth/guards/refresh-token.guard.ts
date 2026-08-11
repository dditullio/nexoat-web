import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { AuthService } from '../auth.service'
import { REFRESH_COOKIE_NAME } from '../auth.utils'

/**
 * El refresh token es un string opaco hasheado en DB, no un JWT — por eso
 * esto es un guard a mano en vez de una estrategia Passport "jwt-refresh":
 * no hay nada que un `JwtStrategy` pueda verificar criptográficamente,
 * la validación es un lookup contra `RefreshToken.tokenHash`.
 */
@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest & { refreshToken?: unknown }>()
    const raw = req.cookies?.[REFRESH_COOKIE_NAME]
    if (!raw) throw new UnauthorizedException('Falta la cookie de refresh')

    const record = await this.authService.validateRefreshToken(raw)
    if (!record) throw new UnauthorizedException('Refresh token inválido o expirado')

    req.refreshToken = record
    return true
  }
}
