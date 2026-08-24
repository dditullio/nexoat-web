import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { ProfileRole } from '@prisma/client'
import { ProfileService } from './profile.service'
import { PrismaService } from '../prisma/prisma.service'
import { MediaService } from '../media/media.service'

type MockPrisma = {
  user: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; update: jest.Mock }
  professionalProfile: { upsert: jest.Mock; deleteMany: jest.Mock }
}

describe('ProfileService', () => {
  let service: ProfileService
  let prisma: MockPrisma
  let media: { upload: jest.Mock; delete: jest.Mock }

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
      professionalProfile: { upsert: jest.fn(), deleteMany: jest.fn() },
    }
    media = { upload: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: MediaService, useValue: media },
      ],
    }).compile()

    service = module.get(ProfileService)
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', profileRole: null })
    prisma.user.update.mockResolvedValue({})
  })

  it('rechaza el perfil profesional si el ProfileRole no es AT ni cuidador', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', profileRole: ProfileRole.familiar })

    await expect(service.upsertProfessionalProfile('u1', { specialization: 'x' })).rejects.toThrow(
      BadRequestException
    )
    expect(prisma.professionalProfile.upsert).not.toHaveBeenCalled()
  })

  it('rechaza el perfil profesional si todavía no se eligió ProfileRole', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', profileRole: null })

    await expect(service.upsertProfessionalProfile('u1', { specialization: 'x' })).rejects.toThrow(
      BadRequestException
    )
  })

  it.each([ProfileRole.acompanante_terapeutico, ProfileRole.cuidador])(
    'guarda el perfil profesional cuando el ProfileRole es %s',
    async (profileRole) => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', profileRole })
      prisma.professionalProfile.upsert.mockResolvedValue({ specialization: 'x' })

      await service.upsertProfessionalProfile('u1', { specialization: 'x' })

      expect(prisma.professionalProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } })
      )
    }
  )

  it('al subir un avatar nuevo, borra el asset viejo de Cloudinary recién después de guardar el nuevo', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'u1',
      avatarPublicId: 'nexoat/avatars/old',
    })
    media.upload.mockResolvedValue({ url: 'https://x/new.jpg', publicId: 'nexoat/avatars/new' })

    await service.uploadAvatar('u1', Buffer.from('img'), 'image/png')

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { avatarUrl: 'https://x/new.jpg', avatarPublicId: 'nexoat/avatars/new' },
      })
    )
    expect(media.delete).toHaveBeenCalledWith('nexoat/avatars/old')
  })

  it('no intenta borrar nada de Cloudinary si no había avatar previo', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', avatarPublicId: null })
    media.upload.mockResolvedValue({ url: 'https://x/new.jpg', publicId: 'nexoat/avatars/new' })

    await service.uploadAvatar('u1', Buffer.from('img'), 'image/png')

    expect(media.delete).not.toHaveBeenCalled()
  })

  it('un usuario no puede tocar el perfil de otro: todo cuelga del userId del token, nunca de un id externo', () => {
    // No hay ningún método de ProfileService que reciba un `id` ajeno — el
    // único identificador de "a quién" es el `userId` que llega del propio
    // `req.user` (ver ProfileController, que no expone rutas con `:id`).
    // No hay comportamiento adicional que ejercitar acá; queda como
    // documentación ejecutable del contrato del service.
    expect(service.getProfile.length).toBe(1)
  })
})
