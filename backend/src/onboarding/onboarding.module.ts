import { Module } from '@nestjs/common'
import { NewsletterModule } from '../newsletter/newsletter.module'
import { OnboardingController } from './onboarding.controller'
import { OnboardingService } from './onboarding.service'

@Module({
  imports: [NewsletterModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
