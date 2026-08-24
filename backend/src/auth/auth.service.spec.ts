import { Test } from '@nestjs/testing'
import { JwtModule } from '@nestjs/jwt'
import { BadRequestException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { Role, VerificationTokenType, type User } from '@prisma/client'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'

type MockPrisma = {
  user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  refreshToken: {
    create: jest.Mock
    findUnique: jest.Mock
    update: jest.Mock
    updateMany: jest.Mock
  }
  oAuthAccount: { findUnique: jest.Mock; create: jest.Mock }
  verificationToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock }
}

describe('AuthService', () => {
  let service: AuthService
  let prisma: MockPrisma
  let mail: { send: jest.Mock }

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-secret'

    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      oAuthAccount: { findUnique: jest.fn(), create: jest.fn() },
      verificationToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    }
    mail = { send: jest.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile()

    service = module.get(AuthService)
  })

  describe('requestSignup', () => {
    it('crea una cuenta pendiente (sin passwordHash) y manda la activación', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockImplementation(({ data }: { data: Partial<User> }) => ({
        id: '1',
        ...data,
      }))

      await service.requestSignup({ email: 'x@x.com' })

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'x@x.com', role: Role.USER },
      })
      expect(mail.send).toHaveBeenCalledWith(
        'x@x.com',
        expect.stringContaining('Confirmá'),
        expect.any(String),
        expect.any(String)
      )
    })

    it('con una cuenta pendiente ya existente, reenvía la activación sin crear otra cuenta', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'x@x.com', passwordHash: null })

      await service.requestSignup({ email: 'x@x.com' })

      expect(prisma.user.create).not.toHaveBeenCalled()
      expect(mail.send).toHaveBeenCalledWith(
        'x@x.com',
        expect.stringContaining('Confirmá'),
        expect.any(String),
        expect.any(String)
      )
    })

    it('con una cuenta ya completa, manda el aviso de "ya tenés cuenta" en vez de una activación', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'x@x.com', passwordHash: 'hash' })

      await service.requestSignup({ email: 'x@x.com' })

      expect(prisma.user.create).not.toHaveBeenCalled()
      expect(mail.send).toHaveBeenCalledWith(
        'x@x.com',
        expect.stringContaining('Ya tenés'),
        expect.any(String)
      )
    })

    it('no rompe si el email falla (fire-and-forget con catch interno)', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockImplementation(({ data }: { data: Partial<User> }) => ({
        id: '1',
        ...data,
      }))
      mail.send.mockRejectedValue(new Error('Resend caído'))

      await expect(service.requestSignup({ email: 'x@x.com' })).resolves.toBeUndefined()
    })
  })

  describe('completeSignup', () => {
    it('rechaza si las contraseñas no coinciden, sin tocar ningún token', async () => {
      await expect(
        service.completeSignup({
          token: 'raw',
          name: 'X',
          password: 'a12345678',
          passwordConfirm: 'b12345678',
        })
      ).rejects.toThrow(BadRequestException)
      expect(prisma.verificationToken.findUnique).not.toHaveBeenCalled()
    })

    it('rechaza un token inválido/vencido', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(null)

      await expect(
        service.completeSignup({
          token: 'raw',
          name: 'X',
          password: '12345678',
          passwordConfirm: '12345678',
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('activa la cuenta: setea contraseña, nombre y emailVerified, y devuelve sesión', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 't1',
        type: VerificationTokenType.account_activation,
        usedAt: null,
        expiresAt: new Date(Date.now() + 10_000),
        user: { id: 'u1', email: 'x@x.com' },
      })
      prisma.user.update.mockImplementation(({ data }: { data: Partial<User> }) => ({
        id: 'u1',
        email: 'x@x.com',
        ...data,
      }))

      const user = await service.completeSignup({
        token: 'raw',
        name: 'María',
        password: '12345678',
        passwordConfirm: '12345678',
      })

      expect(user.name).toBe('María')
      expect(user.emailVerified).toBeInstanceOf(Date)
      expect(await bcrypt.compare('12345678', user.passwordHash!)).toBe(true)
      expect(mail.send).toHaveBeenCalledWith(
        'x@x.com',
        expect.stringContaining('Bienvenido'),
        expect.any(String)
      )
    })

    it('rechaza un token de otro tipo (ej. reset de contraseña) usado acá', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 't1',
        type: VerificationTokenType.password_reset,
        usedAt: null,
        expiresAt: new Date(Date.now() + 10_000),
        user: { id: 'u1', email: 'x@x.com' },
      })

      await expect(
        service.completeSignup({
          token: 'raw',
          name: 'X',
          password: '12345678',
          passwordConfirm: '12345678',
        })
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('validateLocalUser', () => {
    it('devuelve null si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      expect(await service.validateLocalUser('x@x.com', 'pw')).toBeNull()
    })

    it('devuelve null si la cuenta es 100% OAuth (sin passwordHash)', async () => {
      prisma.user.findUnique.mockResolvedValue({ passwordHash: null, isActive: true })
      expect(await service.validateLocalUser('x@x.com', 'pw')).toBeNull()
    })

    it('devuelve null si la cuenta está desactivada', async () => {
      prisma.user.findUnique.mockResolvedValue({ passwordHash: 'hash', isActive: false })
      expect(await service.validateLocalUser('x@x.com', 'pw')).toBeNull()
    })

    it('devuelve el usuario si la contraseña matchea', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10)
      prisma.user.findUnique.mockResolvedValue({ id: '1', passwordHash, isActive: true })

      const user = await service.validateLocalUser('x@x.com', 'secret123')

      expect(user?.id).toBe('1')
    })
  })

  describe('tokens de sesión', () => {
    const fakeUser = { id: '1', email: 'x@x.com', role: Role.USER } as User

    it('issueTokens persiste un RefreshToken hasheado y firma un access token JWT', async () => {
      prisma.refreshToken.create.mockResolvedValue({})

      const { accessToken, refreshToken } = await service.issueTokens(fakeUser, {})

      expect(accessToken.split('.')).toHaveLength(3)
      expect(refreshToken).toHaveLength(96) // 48 bytes en hex
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: '1' }) })
      )
      // nunca se persiste el token crudo, solo su hash
      const persistedHash = prisma.refreshToken.create.mock.calls[0][0].data.tokenHash
      expect(persistedHash).not.toBe(refreshToken)
    })

    it('validateRefreshToken devuelve null si el token expiró', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
        user: { isActive: true },
      })
      expect(await service.validateRefreshToken('raw')).toBeNull()
    })

    it('validateRefreshToken devuelve null si el usuario está desactivado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() + 10_000),
        revokedAt: null,
        user: { isActive: false },
      })
      expect(await service.validateRefreshToken('raw')).toBeNull()
    })

    it('validateRefreshToken devuelve null si ya fue revocado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() + 10_000),
        revokedAt: new Date(),
        user: { isActive: true },
      })
      expect(await service.validateRefreshToken('raw')).toBeNull()
    })
  })

  describe('getProviders', () => {
    it('reporta false para ambos si no hay credenciales OAuth en el entorno', () => {
      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_SECRET
      delete process.env.FACEBOOK_CLIENT_ID
      delete process.env.FACEBOOK_CLIENT_SECRET

      expect(service.getProviders()).toEqual({ google: false, facebook: false })
    })

    it('reporta true solo para el proveedor con ambas variables seteadas', () => {
      process.env.GOOGLE_CLIENT_ID = 'id'
      process.env.GOOGLE_CLIENT_SECRET = 'secret'
      delete process.env.FACEBOOK_CLIENT_ID
      delete process.env.FACEBOOK_CLIENT_SECRET

      expect(service.getProviders()).toEqual({ google: true, facebook: false })
    })
  })

  describe('verifyEmail', () => {
    it('rechaza un token inexistente', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(null)
      await expect(service.verifyEmail('raw')).rejects.toThrow(BadRequestException)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('rechaza un token del tipo equivocado (ej. uno de reset usado como verificación)', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 't1',
        type: VerificationTokenType.password_reset,
        usedAt: null,
        expiresAt: new Date(Date.now() + 10_000),
        user: { id: 'u1' },
      })
      await expect(service.verifyEmail('raw')).rejects.toThrow(BadRequestException)
    })

    it('rechaza un token ya usado', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 't1',
        type: VerificationTokenType.email_verification,
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 10_000),
        user: { id: 'u1' },
      })
      await expect(service.verifyEmail('raw')).rejects.toThrow(BadRequestException)
    })

    it('rechaza un token vencido', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 't1',
        type: VerificationTokenType.email_verification,
        usedAt: null,
        expiresAt: new Date(Date.now() - 10_000),
        user: { id: 'u1' },
      })
      await expect(service.verifyEmail('raw')).rejects.toThrow(BadRequestException)
    })

    it('marca el token como usado y setea emailVerified con un token válido', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 't1',
        type: VerificationTokenType.email_verification,
        usedAt: null,
        expiresAt: new Date(Date.now() + 10_000),
        user: { id: 'u1' },
      })

      await service.verifyEmail('raw')

      expect(prisma.verificationToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't1' }, data: { usedAt: expect.any(Date) } })
      )
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' } })
      )
    })
  })

  describe('requestPasswordReset', () => {
    it('no manda nada ni lanza si el email no existe (evita enumeración)', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      await expect(service.requestPasswordReset('nadie@x.com')).resolves.toBeUndefined()
      expect(mail.send).not.toHaveBeenCalled()
      expect(prisma.verificationToken.create).not.toHaveBeenCalled()
    })

    it('no manda nada si la cuenta es 100% OAuth (sin passwordHash que resetear)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isActive: true,
        passwordHash: null,
        email: 'x@x.com',
      })
      await service.requestPasswordReset('x@x.com')
      expect(mail.send).not.toHaveBeenCalled()
    })

    it('manda el email de reset si la cuenta existe y tiene contraseña', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isActive: true,
        passwordHash: 'hash',
        email: 'x@x.com',
      })

      await service.requestPasswordReset('x@x.com')

      expect(prisma.verificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            type: VerificationTokenType.password_reset,
          }),
        })
      )
      expect(mail.send).toHaveBeenCalledWith('x@x.com', expect.any(String), expect.any(String))
    })
  })

  describe('resetPassword', () => {
    it('rechaza un token inválido sin tocar la contraseña', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(null)
      await expect(service.resetPassword('raw', 'nueva12345')).rejects.toThrow(BadRequestException)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('cambia la contraseña y revoca todas las sesiones activas del usuario', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        id: 't1',
        type: VerificationTokenType.password_reset,
        usedAt: null,
        expiresAt: new Date(Date.now() + 10_000),
        user: { id: 'u1' },
      })

      await service.resetPassword('raw', 'nueva12345')

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' } })
      )
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      })
    })
  })

  describe('resendVerificationEmail', () => {
    it('no manda nada si el usuario ya está verificado', async () => {
      await service.resendVerificationEmail({
        id: 'u1',
        email: 'x@x.com',
        emailVerified: new Date(),
      } as User)

      expect(mail.send).not.toHaveBeenCalled()
      expect(prisma.verificationToken.create).not.toHaveBeenCalled()
    })

    it('manda un email nuevo si todavía no está verificado', async () => {
      await service.resendVerificationEmail({
        id: 'u1',
        email: 'x@x.com',
        emailVerified: null,
      } as User)

      expect(mail.send).toHaveBeenCalledWith('x@x.com', expect.any(String), expect.any(String))
    })
  })
})
