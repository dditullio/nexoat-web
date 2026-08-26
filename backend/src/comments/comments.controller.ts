import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { CommentsService } from './comments.service'
import { CommentLikesService } from './comment-likes.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'
import { QueryCommentsDto } from './dto/query-comments.dto'
import { ReportCommentDto } from './dto/report-comment.dto'

@ApiTags('comments')
@Controller()
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly likesService: CommentLikesService
  ) {}

  @Get('articles/:slug/comments')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Comentarios raíz de un artículo, paginados, con hasta 3 respuestas embebidas por hilo',
  })
  listForArticle(
    @Param('slug') slug: string,
    @Query() query: QueryCommentsDto,
    @CurrentUser() user?: User
  ) {
    return this.commentsService.listForArticle(slug, user, query)
  }

  @Get('comments/:id/replies')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiOperation({ summary: 'Resto de las respuestas de un hilo ("ver N respuestas más")' })
  listReplies(
    @Param('id') id: string,
    @Query('skip') skip: string | undefined,
    @CurrentUser() user?: User
  ) {
    return this.commentsService.listReplies(id, user, skip ? Number(skip) : 0)
  }

  @Post('articles/:slug/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publica un comentario (o una respuesta, con parentId)' })
  create(@Param('slug') slug: string, @CurrentUser() user: User, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(slug, user, dto)
  }

  @Patch('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edita un comentario propio' })
  update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdateCommentDto) {
    return this.commentsService.update(id, user, dto)
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Borra un comentario propio (o cualquiera, si sos EDITOR+)' })
  async remove(@Param('id') id: string, @CurrentUser() user: User): Promise<{ ok: true }> {
    await this.commentsService.remove(id, user)
    return { ok: true }
  }

  @Post('comments/:id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Da like a un comentario (idempotente)' })
  like(@Param('id') id: string, @CurrentUser() user: User) {
    return this.likesService.like(id, user.id)
  }

  @Delete('comments/:id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Quita el like (idempotente)' })
  unlike(@Param('id') id: string, @CurrentUser() user: User) {
    return this.likesService.unlike(id, user.id)
  }

  @Post('comments/:id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Reporta un comentario para moderación (idempotente)' })
  async report(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: ReportCommentDto
  ): Promise<{ ok: true }> {
    await this.commentsService.report(id, user.id, dto)
    return { ok: true }
  }
}
