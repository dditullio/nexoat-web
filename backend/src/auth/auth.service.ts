import { createHash, randomBytes } from 'node:crypto'
import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { Role, type AuthProvider, type RefreshToken, type User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import { welcomeEmailHtml } from '../mail/templates/welcome.template'
import type { RegisterDto } from './dto/register.dto'
import type { JwtPayload } from './types/jwt-payload.interface'

const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
const BCRYPT_ROUNDS = 10

export interface OAuthProfile {
  email: string
  name?: string
  avatarUrl?: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mail: MailService
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Ya existe una cuenta con ese email')

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name, role: Role.USER },
    })

    this.sendWelcomeEmail(user)
    return user
  }

  /** Usado por `LocalStrategy`. Devuelve `null` en cualquier credencial inválida (sin distinguir el motivo, para no filtrar qué emails existen). */
  async validateLocalUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash || !user.isActive) return null
    const valid = await bcrypt.compare(password, user.passwordHash)
    return valid ? user : null
  }

  /** Usado por `GoogleStrategy`/`FacebookStrategy`: reutiliza la cuenta si ya existe (por proveedor o por email), si no la crea con rol USER. */
  async validateOAuthLogin(
    provider: AuthProvider,
    providerUserId: string,
    profile: OAuthProfile
  ): Promise<User> {
    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: true },
    })
    if (existingAccount) {
      if (!existingAccount.user.isActive) throw new UnauthorizedException('Cuenta desactivada')
      return existingAccount.user
    }

    let user = await this.prisma.user.findUnique({ where: { email: profile.email } })
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          role: Role.USER,
          emailVerified: new Date(), // el proveedor OAuth ya lo verificó
        },
      })
      this.sendWelcomeEmail(user)
    } else if (!user.isActive) {
      throw new UnauthorizedException('Cuenta desactivada')
    }

    await this.prisma.oAuthAccount.create({ data: { provider, providerUserId, userId: user.id } })
    return user
  }

  // Fire-and-forget: un email de bienvenida que falla nunca debe tirar
  // abajo el alta de la cuenta (mismo criterio que
  // ArticlesService.findPublishedBySlug con el historial de lectura).
  private sendWelcomeEmail(user: User): void {
    this.mail
      .send(user.email, '¡Bienvenido/a a NexoAT!', welcomeEmailHtml(user.name ?? undefined))
      .catch((error: unknown) => {
        this.logger.warn(`No se pudo enviar el email de bienvenida: ${String(error)}`)
      })
  }

  private signAccessToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: ACCESS_TOKEN_TTL,
    })
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
  }

  /** Emite un par access+refresh nuevo y persiste el refresh (hasheado). */
  async issueTokens(
    user: User,
    meta: { userAgent?: string; ip?: string }
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.signAccessToken(user)
    const rawRefreshToken = randomBytes(48).toString('hex')

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(rawRefreshToken),
        userId: user.id,
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    })

    return { accessToken, refreshToken: rawRefreshToken }
  }

  /** Usado por `RefreshTokenGuard`. `null` si el token no existe, expiró, fue revocado o el usuario está desactivado. */
  async validateRefreshToken(raw: string): Promise<(RefreshToken & { user: User }) | null> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(raw) },
      include: { user: true },
    })
    if (!record || record.revokedAt || record.expiresAt < new Date() || !record.user.isActive) {
      return null
    }
    return record
  }

  /** Rotación: revoca el refresh usado y emite un par nuevo — mitiga replay si un refresh token filtra. */
  async rotateRefreshToken(
    record: RefreshToken & { user: User },
    meta: { userAgent?: string; ip?: string }
  ) {
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    })
    return this.issueTokens(record.user, meta)
  }

  async revokeRefreshToken(raw: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  getProviders(): { google: boolean; facebook: boolean } {
    return {
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebook: Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
    }
  }
}
