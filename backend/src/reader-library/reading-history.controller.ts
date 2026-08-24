import { Controller, Delete, Get, HttpCode, Param, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ReadingHistoryService } from './reading-history.service'
import { QueryLibraryDto } from './dto/query-library.dto'

// Sin RolesGuard, mismo criterio que ProfileController: todo cuelga del
// userId del token, nunca de un id de la URL.
@ApiTags('reader-library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/history')
export class ReadingHistoryController {
  constructor(private readonly historyService: ReadingHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Historial de lectura del usuario, paginado (más reciente primero)' })
  list(@CurrentUser() user: User, @Query() query: QueryLibraryDto) {
    return this.historyService.list(user.id, query)
  }

  @Delete()
  @HttpCode(200)
  @ApiOperation({ summary: 'Vacía todo el historial de lectura' })
  async clear(@CurrentUser() user: User): Promise<{ ok: true }> {
    await this.historyService.clear(user.id)
    return { ok: true }
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Quita una entrada puntual del historial' })
  async removeOne(@CurrentUser() user: User, @Param('id') id: string): Promise<{ ok: true }> {
    await this.historyService.removeOne(user.id, id)
    return { ok: true }
  }
}
