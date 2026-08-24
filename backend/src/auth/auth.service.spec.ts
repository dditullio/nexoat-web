import { Test } from '@nestjs/testing'
import { JwtModule } from '@nestjs/jwt'
import { ConflictException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { Role, type User } from '@prisma/client'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'

type MockPrisma = {
  user: { findUnique: jest.Mock; create: jest.Mock }
  refreshToken: {
    create: jest.Mock
    findUnique: jest.Mock
    update: jest.Mock
    updateMany: jest.Mock
  }
  oAuthAccount: { findUnique: jest.Mock; create: jest.Mock }
}

describe('AuthService', () => {
  let service: AuthService
  let prisma: MockPrisma
  let mail: { send: jest.Mock }

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-secret'

    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      oAuthAccount: { findUnique: jest.fn(), create: jest.fn() },
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

  describe('register', () => {
    it('lanza ConflictException si el email ya existe', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' })

      await expect(service.register({ email: 'x@x.com', password: '12345678' })).rejects.toThrow(
        ConflictException
      )
    })

    it('crea el usuario con la contraseña hasheada y rol USER', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockImplementation(({ data }: { data: Partial<User> }) => ({
        id: '1',
        ...data,
      }))

      const user = await service.register({ email: 'x@x.com', password: '12345678' })

      expect(user.role).toBe(Role.USER)
      expect(user.passwordHash).not.toBe('12345678')
      expect(await bcrypt.compare('12345678', user.passwordHash!)).toBe(true)
    })

    it('dispara el email de bienvenida sin bloquear el alta', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockImplementation(({ data }: { data: Partial<User> }) => ({
        id: '1',
        ...data,
      }))

      await service.register({ email: 'x@x.com', password: '12345678' })

      expect(mail.send).toHaveBeenCalledWith(
        'x@x.com',
        expect.stringContaining('Bienvenido'),
        expect.any(String)
      )
    })

    it('el alta no falla aunque el email de bienvenida falle', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockImplementation(({ data }: { data: Partial<User> }) => ({
        id: '1',
        ...data,
      }))
      mail.send.mockRejectedValue(new Error('Resend caído'))

      await expect(
        service.register({ email: 'x@x.com', password: '12345678' })
      ).resolves.toBeDefined()
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
})
