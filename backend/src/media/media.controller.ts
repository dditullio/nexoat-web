import {
  BadRequestException,
  Controller,
  Delete,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MEDIA_FOLDERS,
  MediaService,
  type MediaFolder,
} from './media.service'

@ApiTags('admin/media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Sube una imagen a Cloudinary — campo "file", máx. 5MB. ?folder=articles|categories (default articles)',
  })
  async upload(@Req() req: FastifyRequest, @Query('folder') folderParam?: string) {
    const folder = this.resolveFolder(folderParam)

    const file = await req.file()
    if (!file) throw new BadRequestException('Falta el archivo (campo "file")')

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Solo se aceptan imágenes JPEG, PNG, WEBP o GIF')
    }

    const buffer = await file.toBuffer()
    // @fastify/multipart no corta el stream a mitad de archivo cuando se
    // pasa `limits.fileSize` en el registro del plugin (ver main.ts): en
    // cambio marca `file.truncated` y sigue — hay que chequearlo a mano.
    if (file.file.truncated) {
      throw new BadRequestException(
        `La imagen supera el máximo de ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`
      )
    }

    return this.mediaService.upload(buffer, file.mimetype, folder)
  }

  private resolveFolder(folderParam?: string): MediaFolder {
    if (!folderParam) return 'articles'
    if (!MEDIA_FOLDERS.includes(folderParam as MediaFolder)) {
      throw new BadRequestException(`folder debe ser uno de: ${MEDIA_FOLDERS.join(', ')}`)
    }
    return folderParam as MediaFolder
  }

  @Delete()
  @ApiOperation({ summary: 'Borra una imagen de Cloudinary por su publicId (querystring)' })
  async remove(@Query('publicId') publicId?: string) {
    if (!publicId) throw new BadRequestException('Falta el parámetro publicId')
    await this.mediaService.delete(publicId)
    return { ok: true }
  }
}
