import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Público — el tema visual de cada categoría (color, ícono, gradiente)
 * sigue viviendo 100% en el frontend (`utils/theme.ts`, `CATEGORY_THEMES`):
 * acá solo se sirve slug/name/description, que el store mergea por slug.
 */
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Listado de categorías' })
  findAll() {
    return this.prisma.category.findMany({
      select: { slug: true, name: true, description: true, icon: true },
      orderBy: { name: 'asc' },
    })
  }
}
