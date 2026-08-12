import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Público — el color/gradiente/ícono de fallback de cada categoría sigue
 * viviendo 100% en el frontend (`utils/theme.ts`, `CATEGORY_THEMES`), no
 * en la base de datos. `coverImage` sí viene de acá (subida vía
 * AdminCategoriesController) y el frontend la usa como foto si existe.
 */
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Listado de categorías' })
  findAll() {
    return this.prisma.category.findMany({
      select: { slug: true, name: true, description: true, icon: true, coverImage: true },
      orderBy: { name: 'asc' },
    })
  }
}
