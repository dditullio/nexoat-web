import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Role, type User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ALLOWED_EBOOK_MIME_TYPES, GiftsService, MAX_EBOOK_FILE_SIZE_BYTES } from './gifts.service'
import { CreateGiftDto } from './dto/create-gift.dto'
import { UpdateGiftDto } from './dto/update-gift.dto'

/**
 * CRUD del regalo de bienvenida (ver docs/features/welcome-ebook-gift.md).
 * La tapa se sube contra el endpoint genérico `/admin/media?folder=ebook-covers`
 * (mismo patrón que categorías) — acá solo el PDF, que no pasa por Cloudinary.
 */
@ApiTags('admin/gifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/gifts')
export class AdminGiftsController {
  constructor(private readonly gifts: GiftsService) {}

  @Get()
  @ApiOperation({ summary: 'Listado admin de ebooks de regalo, incluidos los inactivos/sin PDF' })
  findAll() {
    return this.gifts.findAllAdmin()
  }

  @Post()
  @ApiOperation({ summary: 'Crea un título nuevo (sin tapa ni PDF todavía)' })
  create(@Body() dto: CreateGiftDto, @CurrentUser() actor: User) {
    return this.gifts.create(dto, actor.id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita título/subtítulo/temática/resumen/activo y/o la tapa' })
  update(@Param('id') id: string, @Body() dto: UpdateGiftDto, @CurrentUser() actor: User) {
    return this.gifts.update(id, dto, actor.id)
  }

  @Post(':id/file')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Sube/reemplaza el PDF — campo "file", máx. 25MB' })
  async uploadFile(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
    @CurrentUser() actor: User
  ) {
    const file = await req.file({ limits: { fileSize: MAX_EBOOK_FILE_SIZE_BYTES } })
    if (!file) throw new BadRequestException('Falta el archivo (campo "file")')
    if (!ALLOWED_EBOOK_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('El regalo tiene que ser un PDF')
    }

    const buffer = await file.toBuffer()
    // @fastify/multipart no corta el stream a mitad de archivo, solo marca
    // `truncated` y sigue — mismo chequeo que MediaController/BackupController.
    if (file.file.truncated) {
      throw new BadRequestException(
        `El archivo supera el máximo de ${MAX_EBOOK_FILE_SIZE_BYTES / 1024 / 1024}MB`
      )
    }

    return this.gifts.uploadFile(id, buffer, file.filename, actor.id)
  }

  @Delete(':id/file')
  @ApiOperation({ summary: 'Quita el PDF cargado (el título sigue existiendo, pero se oculta)' })
  removeFile(@Param('id') id: string, @CurrentUser() actor: User) {
    return this.gifts.removeFile(id, actor.id)
  }
}
