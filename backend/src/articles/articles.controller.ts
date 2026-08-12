import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { ArticlesService } from './articles.service'
import { QueryPublicArticlesDto } from './dto/query-public-articles.dto'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Listado público — solo artículos publicados' })
  findAll(@Query() query: QueryPublicArticlesDto) {
    return this.articlesService.findPublished(query)
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Detalle público por slug — solo si está publicado. Si el viewer no tiene acceso al `scope` del artículo, devuelve el contenido recortado.',
  })
  findOne(@Param('slug') slug: string, @CurrentUser() user?: User) {
    return this.articlesService.findPublishedBySlug(slug, user)
  }
}
