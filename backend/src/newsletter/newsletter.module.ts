import { Module } from '@nestjs/common'
import { NewsletterService } from './newsletter.service'
import { ResendAudienceService } from './resend-audience.service'
import { NewsletterController } from './newsletter.controller'
import { MeNewsletterController } from './me-newsletter.controller'
import { AdminNewsletterController } from './admin-newsletter.controller'

@Module({
  controllers: [NewsletterController, MeNewsletterController, AdminNewsletterController],
  providers: [NewsletterService, ResendAudienceService],
  // OnboardingModule reusa subscribe() para el opt-in del paso 2 — ver
  // docs/features/email-first-signup-and-onboarding.md.
  exports: [NewsletterService],
})
export class NewsletterModule {}
