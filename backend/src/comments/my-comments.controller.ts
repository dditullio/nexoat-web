import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { CommentsService } from './comments.service'
import { QueryCommentsDto } from './dto/query-comments.dto'

// Sin RolesGuard, mismo criterio que ReadingHistoryController/ProfileController.
@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/comments')
export class MyCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Comentarios propios, paginados (más reciente primero), con el artículo y los likes recibidos',
  })
  list(@CurrentUser() user: User, @Query() query: QueryCommentsDto) {
    return this.commentsService.listMine(user.id, query)
  }
}
