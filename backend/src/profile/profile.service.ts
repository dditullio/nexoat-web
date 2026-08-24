import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ProfileRole, type Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MediaService } from '../media/media.service'
import type { UpdateProfileDto } from './dto/update-profile.dto'
import type { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto'

// Solo estos dos ProfileRole pueden tener un ProfessionalProfile — ver
// docs/features/reader-profile.md. Un usuario que ya tenía uno cargado y
// cambia a familiar/otro conserva el registro (no se borra solo), pero deja
// de poder editarlo desde acá hasta volver a AT/Cuidador.
const PROFESSIONAL_PROFILE_ROLES: ProfileRole[] = [
  ProfileRole.acompanante_terapeutico,
  ProfileRole.cuidador,
]

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  subscriptionTier: true,
  profileRole: true,
  isActive: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  professionalProfile: true,
} satisfies Prisma.UserSelect

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    })
    if (!user) throw new NotFoundException('Usuario no encontrado')
    return user
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, profileRole: dto.profileRole },
    })
    return this.getProfile(userId)
  }

  async uploadAvatar(userId: string, buffer: Buffer, mimetype: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const uploaded = await this.media.upload(buffer, mimetype, 'avatars')

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: uploaded.url, avatarPublicId: uploaded.publicId },
    })

    // Se borra el asset viejo recién después de que el nuevo ya se guardó
    // (mismo orden que AdminArticleFormView con coverImage): si el borrado
    // falla, el usuario se queda con el avatar nuevo en vez de sin ninguno.
    if (user.avatarPublicId) {
      await this.media.delete(user.avatarPublicId).catch(() => undefined)
    }

    return this.getProfile(userId)
  }

  async deleteAvatar(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null, avatarPublicId: null },
    })

    if (user.avatarPublicId) {
      await this.media.delete(user.avatarPublicId).catch(() => undefined)
    }

    return this.getProfile(userId)
  }

  async upsertProfessionalProfile(userId: string, dto: UpdateProfessionalProfileDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    this.assertCanHaveProfessionalProfile(user.profileRole)

    await this.prisma.professionalProfile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    })

    return this.getProfile(userId)
  }

  async deleteProfessionalProfile(userId: string) {
    await this.prisma.professionalProfile.deleteMany({ where: { userId } })
    return this.getProfile(userId)
  }

  private assertCanHaveProfessionalProfile(profileRole: ProfileRole | null) {
    if (!profileRole || !PROFESSIONAL_PROFILE_ROLES.includes(profileRole)) {
      throw new BadRequestException(
        'El perfil profesional solo está disponible para Acompañante Terapéutico o Cuidador/a'
      )
    }
  }
}
