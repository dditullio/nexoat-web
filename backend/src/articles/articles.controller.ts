import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ArticlesService } from './articles.service'
import { QueryPublicArticlesDto } from './dto/query-public-articles.dto'

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
  @ApiOperation({ summary: 'Detalle público por slug — solo si está publicado' })
  findOne(@Param('slug') slug: string) {
    return this.articlesService.findPublishedBySlug(slug)
  }
}
