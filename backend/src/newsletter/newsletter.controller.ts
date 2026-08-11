import { Body, Controller, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { NewsletterService } from './newsletter.service'
import { SubscribeDto } from './dto/subscribe.dto'

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Alta al newsletter — reemplaza el submit simulado de HomeView' })
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto)
  }
}
