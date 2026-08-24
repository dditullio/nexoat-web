import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES } from '../media/media.service'
import { ProfileService } from './profile.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto'

// Sin RolesGuard a propósito: cada endpoint actúa sobre `req.user` (el
// dueño del token), nunca sobre un `id` de la URL — cualquier rol
// autenticado gestiona su propio perfil. Distinto de UsersController
// (/admin/users), que es un ADMIN+ gestionando a otros. Ver
// docs/features/reader-profile.md.
@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Perfil del usuario autenticado, incluido su perfil profesional' })
  getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id)
  }

  @Patch()
  @ApiOperation({ summary: 'Actualiza nombre y/o tipo de usuario (ProfileRole)' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, dto)
  }

  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Sube/reemplaza el avatar del usuario — campo "file", máx. 5MB' })
  async uploadAvatar(@CurrentUser() user: User, @Req() req: FastifyRequest) {
    const file = await req.file()
    if (!file) throw new BadRequestException('Falta el archivo (campo "file")')

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Solo se aceptan imágenes JPEG, PNG, WEBP o GIF')
    }

    const buffer = await file.toBuffer()
    // Ver el mismo chequeo en MediaController: @fastify/multipart no corta
    // el stream, solo marca `truncated` y sigue.
    if (file.file.truncated) {
      throw new BadRequestException(
        `La imagen supera el máximo de ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`
      )
    }

    return this.profileService.uploadAvatar(user.id, buffer, file.mimetype)
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Quita el avatar actual (borra el asset de Cloudinary)' })
  deleteAvatar(@CurrentUser() user: User) {
    return this.profileService.deleteAvatar(user.id)
  }

  @Put('professional')
  @ApiOperation({
    summary: 'Crea/actualiza el perfil profesional (mini-currículum)',
    description: 'Exige que el ProfileRole actual sea Acompañante Terapéutico o Cuidador/a.',
  })
  upsertProfessionalProfile(@CurrentUser() user: User, @Body() dto: UpdateProfessionalProfileDto) {
    return this.profileService.upsertProfessionalProfile(user.id, dto)
  }

  @Delete('professional')
  @ApiOperation({ summary: 'Borra el perfil profesional' })
  deleteProfessionalProfile(@CurrentUser() user: User) {
    return this.profileService.deleteProfessionalProfile(user.id)
  }
}
