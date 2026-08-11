import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../../prisma/prisma.service'
import type { JwtPayload } from '../types/jwt-payload.interface'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error('Falta JWT_ACCESS_SECRET en el entorno')
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET,
      ignoreExpiration: false,
    })
  }

  // Se re-consulta el usuario (en vez de confiar ciegamente en el payload)
  // para que una desactivación de cuenta corte el acceso sin esperar a que
  // expire el access token — el costo extra de DB solo pega en requests
  // autenticados, no en la lectura pública del blog.
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.isActive) throw new UnauthorizedException('Sesión inválida')
    return user
  }
}
