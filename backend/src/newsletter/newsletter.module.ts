import { Module } from '@nestjs/common'
import { NewsletterService } from './newsletter.service'
import { ResendAudienceService } from './resend-audience.service'
import { NewsletterController } from './newsletter.controller'
import { AdminNewsletterController } from './admin-newsletter.controller'

@Module({
  controllers: [NewsletterController, AdminNewsletterController],
  providers: [NewsletterService, ResendAudienceService],
})
export class NewsletterModule {}
