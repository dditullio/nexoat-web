import { Body, Controller, Get, Post, Res, StreamableFile, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { FastifyReply } from 'fastify'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { GiftsService } from './gifts.service'
import { ClaimGiftDto } from './dto/claim-gift.dto'

// Sin RolesGuard, mismo criterio que ProfileController/OnboardingController:
// actúa sobre el usuario del token. Ver docs/features/welcome-ebook-gift.md.
@ApiTags('gifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gifts')
export class GiftsController {
  constructor(private readonly gifts: GiftsService) {}

  @Get('available')
  @ApiOperation({
    summary: 'Títulos disponibles para elegir como regalo de bienvenida (activos y con PDF)',
  })
  available() {
    return this.gifts.available()
  }

  @Get('my-claim')
  @ApiOperation({ summary: 'El ebook que ya eligió el usuario actual, o null' })
  myClaim(@CurrentUser() user: User) {
    return this.gifts.myClaim(user.id)
  }

  @Post('claim')
  @ApiOperation({ summary: 'Elige un ebook de regalo — un solo regalo por usuario' })
  claim(@CurrentUser() user: User, @Body() dto: ClaimGiftDto) {
    return this.gifts.claim(user.id, dto.ebookId)
  }

  @Get('download')
  @ApiOperation({ summary: 'Descarga el PDF del ebook que el usuario ya reclamó' })
  async download(@CurrentUser() user: User, @Res({ passthrough: true }) res: FastifyReply) {
    const { stream, filename } = await this.gifts.openForDownload(user.id)
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', `attachment; filename="${filename}"`)
    return new StreamableFile(stream)
  }
}
