import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role, type User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ArticlesService } from './articles.service'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { QueryAdminArticlesDto } from './dto/query-admin-articles.dto'

@ApiTags('admin/articles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Listado admin — cualquier status, filtrable' })
  findAll(@Query() query: QueryAdminArticlesDto) {
    return this.articlesService.findAllAdmin(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle admin por id' })
  findOne(@Param('id') id: string) {
    return this.articlesService.findOneAdmin(id)
  }

  @Post()
  @ApiOperation({ summary: 'Crea un artículo (borrador salvo que status=publicado)' })
  create(@Body() dto: CreateArticleDto, @CurrentUser() actor: User) {
    return this.articlesService.create(dto, actor)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita un artículo, incluye cambios de status' })
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto, @CurrentUser() actor: User) {
    return this.articlesService.update(id, dto, actor)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Borra un artículo definitivamente' })
  remove(@Param('id') id: string, @CurrentUser() actor: User) {
    return this.articlesService.remove(id, actor)
  }
}
