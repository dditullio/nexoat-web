import { Body, Controller, Get, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role, type User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UpdateCategoryDto } from './dto/update-category.dto'

/**
 * Las 20 categorías son un set fijo (ver seed.ts) — no hay alta/baja acá,
 * solo edición de la imagen de portada de cada una.
 */
@ApiTags('admin/categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listado admin de categorías, incluye coverImage/coverImagePublicId' })
  findAll() {
    return this.prisma.category.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        icon: true,
        coverImage: true,
        coverImagePublicId: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza la imagen de portada de una categoría' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() actor: User
  ) {
    const existing = await this.prisma.category.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Categoría no encontrada')

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        coverImage: dto.coverImage !== undefined ? dto.coverImage || null : undefined,
        coverImagePublicId:
          dto.coverImagePublicId !== undefined ? dto.coverImagePublicId || null : undefined,
      },
    })

    await this.audit.record({
      actorId: actor.id,
      action: 'category.update',
      entityType: 'Category',
      entityId: id,
    })

    return category
  }
}
