import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { NewsletterService } from './newsletter.service'

// Sin RolesGuard, mismo criterio que ProfileController/ReadingHistoryController:
// todo cuelga del email del usuario del token, nunca de uno pasado a mano.
// Distinto de NewsletterController (/newsletter/subscribe|unsubscribe), que
// es el formulario público sin sesión. Ver
// docs/features/email-provider-resend.md, fase 4.
@ApiTags('newsletter')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/newsletter')
export class MeNewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Get()
  @ApiOperation({ summary: '¿El usuario está suscripto al newsletter?' })
  status(@CurrentUser() user: User) {
    return this.newsletterService.getStatus(user.email)
  }

  @Post('subscribe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Suscribe al newsletter el email de la cuenta logueada' })
  subscribe(@CurrentUser() user: User) {
    return this.newsletterService.subscribe({ email: user.email, source: 'preferencias-de-correo' })
  }

  @Post('unsubscribe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Da de baja del newsletter el email de la cuenta logueada' })
  async unsubscribe(@CurrentUser() user: User): Promise<{ ok: true }> {
    await this.newsletterService.unsubscribe({ email: user.email })
    return { ok: true }
  }
}
