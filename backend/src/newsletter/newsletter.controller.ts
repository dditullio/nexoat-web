import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { NewsletterService } from './newsletter.service'
import { SubscribeDto } from './dto/subscribe.dto'
import { UnsubscribeDto } from './dto/unsubscribe.dto'

const NEWSLETTER_THROTTLE = { default: { limit: 10, ttl: 60_000 } }

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @Throttle(NEWSLETTER_THROTTLE)
  @ApiOperation({ summary: 'Alta al newsletter — reemplaza el submit simulado de HomeView' })
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto)
  }

  @Post('unsubscribe')
  @Throttle(NEWSLETTER_THROTTLE)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Baja del newsletter',
    description: 'Siempre responde { ok: true }, exista o no el email — evita enumeración.',
  })
  async unsubscribe(@Body() dto: UnsubscribeDto): Promise<{ ok: true }> {
    await this.newsletterService.unsubscribe(dto)
    return { ok: true }
  }
}
