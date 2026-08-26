import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role, type User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AdminCommentsService } from './admin-comments.service'
import { QueryAdminCommentsDto } from './dto/query-admin-comments.dto'
import { ModerateCommentDto } from './dto/moderate-comment.dto'

@ApiTags('admin/comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/comments')
export class AdminCommentsController {
  constructor(private readonly adminCommentsService: AdminCommentsService) {}

  @Get()
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Listado de comentarios para moderación, filtrable por estado/reportados/texto',
  })
  findAll(@Query() query: QueryAdminCommentsDto) {
    return this.adminCommentsService.findAll(query)
  }

  @Patch(':id/status')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Oculta o restaura un comentario' })
  async setStatus(
    @Param('id') id: string,
    @Body() dto: ModerateCommentDto,
    @CurrentUser() actor: User
  ): Promise<{ ok: true }> {
    await this.adminCommentsService.setStatus(id, dto, actor)
    return { ok: true }
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Borra (borrado blando) un comentario' })
  async remove(@Param('id') id: string, @CurrentUser() actor: User): Promise<{ ok: true }> {
    await this.adminCommentsService.remove(id, actor)
    return { ok: true }
  }
}
