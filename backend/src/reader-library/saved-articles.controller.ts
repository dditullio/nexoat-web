import { Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { SavedArticlesService } from './saved-articles.service'
import { QueryLibraryDto } from './dto/query-library.dto'

@ApiTags('reader-library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/saved-articles')
export class SavedArticlesController {
  constructor(private readonly savedArticlesService: SavedArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Artículos guardados del usuario, paginado (más reciente primero)' })
  list(@CurrentUser() user: User, @Query() query: QueryLibraryDto) {
    return this.savedArticlesService.list(user.id, query)
  }

  @Get(':slug/status')
  @ApiOperation({ summary: '¿El usuario tiene este artículo guardado?' })
  status(@CurrentUser() user: User, @Param('slug') slug: string) {
    return this.savedArticlesService.status(user.id, slug)
  }

  @Post(':slug')
  @ApiOperation({ summary: 'Guarda el artículo (idempotente)' })
  async save(@CurrentUser() user: User, @Param('slug') slug: string): Promise<{ ok: true }> {
    await this.savedArticlesService.save(user.id, slug)
    return { ok: true }
  }

  @Delete(':slug')
  @HttpCode(200)
  @ApiOperation({ summary: 'Quita el artículo de guardados' })
  async unsave(@CurrentUser() user: User, @Param('slug') slug: string): Promise<{ ok: true }> {
    await this.savedArticlesService.unsave(user.id, slug)
    return { ok: true }
  }
}
