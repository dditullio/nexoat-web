import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { Role, type User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { BackupService, MAX_BACKUP_UPLOAD_BYTES } from './backup.service'
import { CreateBackupDto } from './dto/create-backup.dto'

/**
 * Copias de seguridad del contenido de la base (ver
 * docs/features/database-backups.md). Restringido a SUPER_ADMIN: una
 * restauración reemplaza el estado completo del sitio, incluidos usuarios.
 */
@ApiTags('admin/backups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin/backups')
export class BackupController {
  constructor(private readonly backups: BackupService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los respaldos guardados, del más nuevo al más viejo' })
  list() {
    return this.backups.list()
  }

  @Post()
  @ApiOperation({ summary: 'Genera un respaldo nuevo del contenido de la base' })
  create(@Body() dto: CreateBackupDto, @CurrentUser() actor: User) {
    return this.backups.create(toActor(actor), dto.comment ?? null)
  }

  @Get(':filename/download')
  @ApiOperation({ summary: 'Descarga el zip de un respaldo' })
  async download(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const stream = await this.backups.openForDownload(filename)
    res.header('Content-Type', 'application/zip')
    res.header('Content-Disposition', `attachment; filename="${filename}"`)
    return new StreamableFile(stream)
  }

  @Post(':filename/restore')
  @ApiOperation({
    summary: 'Restaura la base desde un respaldo de la lista — REEMPLAZA todo el contenido actual',
  })
  restore(@Param('filename') filename: string, @CurrentUser() actor: User) {
    return this.backups.restoreFromStored(filename, toActor(actor))
  }

  @Post('restore-upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Restaura la base desde un zip subido (campo "file") — REEMPLAZA todo el contenido',
  })
  async restoreUpload(@Req() req: FastifyRequest, @CurrentUser() actor: User) {
    // El límite global de @fastify/multipart es el de las imágenes (5MB,
    // ver main.ts); las opciones por request lo pisan solo para esta ruta.
    const file = await req.file({ limits: { fileSize: MAX_BACKUP_UPLOAD_BYTES } })
    if (!file) throw new BadRequestException('Falta el archivo (campo "file")')
    if (!file.filename.toLowerCase().endsWith('.zip')) {
      throw new BadRequestException('El respaldo tiene que ser un archivo .zip')
    }

    const buffer = await file.toBuffer()
    if (file.file.truncated) {
      throw new BadRequestException(
        `El archivo supera el máximo de ${MAX_BACKUP_UPLOAD_BYTES / 1024 / 1024}MB`
      )
    }

    return this.backups.restoreFromUpload(buffer, file.filename, toActor(actor))
  }
}

function toActor(user: User) {
  return { id: user.id, email: user.email, name: user.name }
}
