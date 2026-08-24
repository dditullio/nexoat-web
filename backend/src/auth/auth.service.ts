import { createHash, randomBytes } from 'node:crypto'
import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import {
  Role,
  VerificationTokenType,
  type AuthProvider,
  type RefreshToken,
  type User,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import { welcomeEmailHtml } from '../mail/templates/welcome.template'
import { verifyEmailHtml } from '../mail/templates/verify-email.template'
import { resetPasswordEmailHtml } from '../mail/templates/reset-password.template'
import {
  activateAccountEmailHtml,
  activateAccountEmailText,
} from '../mail/templates/activate-account.template'
import { alreadyRegisteredEmailHtml } from '../mail/templates/already-registered.template'
import type { RequestSignupDto } from './dto/request-signup.dto'
import type { CompleteSignupDto } from './dto/complete-signup.dto'
import type { JwtPayload } from './types/jwt-payload.interface'

const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
const BCRYPT_ROUNDS = 10

// Verificación/activación: 24h, son de baja urgencia — reset de contraseña:
// 1h, ventana corta porque es una acción sensible. Ver
// docs/features/email-verification-and-password-reset.md y
// docs/features/email-first-signup-and-onboarding.md.
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const ACCOUNT_ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

function frontendUrl(): string {
  return process.env.FRONTEND_URL ?? 'http://localhost:3000'
}

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

  // ─── Registro en dos pasos (email → activar) ────────────────────────────
  // Ver docs/features/email-first-signup-and-onboarding.md.

  /**
   * Nunca revela si el email ya tiene cuenta (anti-enumeración, mismo
   * criterio que `requestPasswordReset`): el caller siempre responde
   * `{ ok: true }`. Tres casos, todos silenciosos desde afuera:
   * - Email nuevo → crea la cuenta pendiente (`passwordHash: null`) y manda
   *   la activación.
   * - Cuenta pendiente ya existente (alguien pidió el alta y no la
   *   completó) → reenvía una activación nueva, idempotente.
   * - Cuenta ya completa (`passwordHash` seteado) → manda el aviso de "ya
   *   tenés cuenta" en vez de una activación.
   */
  async requestSignup(dto: RequestSignupDto): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })

    if (existing?.passwordHash) {
      await this.sendAlreadyRegisteredEmail(existing.email)
      return
    }

    const user =
      existing ?? (await this.prisma.user.create({ data: { email: dto.email, role: Role.USER } }))

    const token = await this.createVerificationToken(
      user.id,
      VerificationTokenType.account_activation,
      ACCOUNT_ACTIVATION_TTL_MS
    )
    await this.sendActivationEmail(user.email, token)
  }

  /** Consume el token, activa la cuenta (contraseña + nombre + email verificado) y abre sesión — mismo mecanismo que login/register antes. */
  async completeSignup(dto: CompleteSignupDto): Promise<User> {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Las contraseñas no coinciden')
    }

    const pending = await this.consumeVerificationToken(
      dto.token,
      VerificationTokenType.account_activation
    )
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
    const user = await this.prisma.user.update({
      where: { id: pending.id },
      data: { passwordHash, name: dto.name, emailVerified: new Date() },
    })

    this.sendWelcomeEmail(user)
    return user
  }

  private async sendActivationEmail(email: string, token: string): Promise<void> {
    const activateUrl = `${frontendUrl()}/completar-registro?token=${token}`
    await this.mail
      .send(
        email,
        'Confirmá tu cuenta en NexoAT',
        activateAccountEmailHtml(activateUrl),
        activateAccountEmailText(activateUrl)
      )
      .catch((error: unknown) => {
        this.logger.warn(`No se pudo enviar el email de activación: ${String(error)}`)
      })
  }

  private async sendAlreadyRegisteredEmail(email: string): Promise<void> {
    const loginUrl = `${frontendUrl()}/ingresar/correo`
    const forgotPasswordUrl = `${frontendUrl()}/recuperar-contrasena`
    await this.mail
      .send(
        email,
        'Ya tenés una cuenta en NexoAT',
        alreadyRegisteredEmailHtml(loginUrl, forgotPasswordUrl)
      )
      .catch((error: unknown) => {
        this.logger.warn(`No se pudo enviar el aviso de "ya tenés cuenta": ${String(error)}`)
      })
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
  // ArticlesService.findPublishedBySlug con el historial de lectura). Se
  // manda siempre a un usuario ya verificado (OAuth lo verifica el
  // proveedor; email lo verifica completeSignup en el mismo paso) — no
  // lleva botón de "confirmá tu email" como llegó a tener en su momento.
  private sendWelcomeEmail(user: User): void {
    this.mail
      .send(user.email, '¡Bienvenido/a a NexoAT!', welcomeEmailHtml(user.name ?? undefined))
      .catch((error: unknown) => {
        this.logger.warn(`No se pudo enviar el email de bienvenida: ${String(error)}`)
      })
  }

  // ─── Verificación de email y reset de contraseña ───────────────────────
  // Ver docs/features/email-verification-and-password-reset.md.

  private async createVerificationToken(
    userId: string,
    type: VerificationTokenType,
    ttlMs: number
  ): Promise<string> {
    const raw = randomBytes(32).toString('hex')
    await this.prisma.verificationToken.create({
      data: {
        userId,
        type,
        tokenHash: this.hashToken(raw),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    })
    return raw
  }

  /** Marca el token como usado y devuelve el usuario dueño — o lanza si no es válido (inexistente, del tipo equivocado, ya usado o vencido). */
  private async consumeVerificationToken(
    rawToken: string,
    type: VerificationTokenType
  ): Promise<User> {
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { user: true },
    })
    if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('El enlace no es válido o ya venció')
    }
    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    })
    return record.user
  }

  /** No-op silencioso si ya está verificado o es una cuenta 100% OAuth (nada que reenviar). */
  async resendVerificationEmail(user: User): Promise<void> {
    if (user.emailVerified) return

    const token = await this.createVerificationToken(
      user.id,
      VerificationTokenType.email_verification,
      EMAIL_VERIFICATION_TTL_MS
    )
    const verifyUrl = `${frontendUrl()}/verificar-correo?token=${token}`
    await this.mail
      .send(user.email, 'Confirmá tu email en NexoAT', verifyEmailHtml(verifyUrl))
      .catch((error: unknown) => {
        this.logger.warn(`No se pudo reenviar el email de verificación: ${String(error)}`)
      })
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const user = await this.consumeVerificationToken(
      rawToken,
      VerificationTokenType.email_verification
    )
    await this.prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } })
  }

  /**
   * Nunca revela si el email existe: siempre resuelve sin lanzar, exista o
   * no la cuenta (o sea 100% OAuth, sin contraseña que resetear) — evita
   * enumeración de cuentas. El caller (AuthController) siempre responde
   * `{ ok: true }` sin importar el resultado acá.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive || !user.passwordHash) return

    const token = await this.createVerificationToken(
      user.id,
      VerificationTokenType.password_reset,
      PASSWORD_RESET_TTL_MS
    )
    const resetUrl = `${frontendUrl()}/restablecer-contrasena?token=${token}`
    await this.mail
      .send(user.email, 'Restablecé tu contraseña en NexoAT', resetPasswordEmailHtml(resetUrl))
      .catch((error: unknown) => {
        this.logger.warn(`No se pudo enviar el email de reset de contraseña: ${String(error)}`)
      })
  }

  /** Éxito → revoca todas las sesiones activas del usuario (mitiga una cuenta comprometida). */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const user = await this.consumeVerificationToken(rawToken, VerificationTokenType.password_reset)
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
    await this.revokeAllRefreshTokens(user.id)
  }

  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
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
