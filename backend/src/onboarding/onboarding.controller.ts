import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { OnboardingService } from './onboarding.service'
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto'
import { toPublicUser } from '../auth/auth.utils'

// Sin RolesGuard, mismo criterio que ProfileController/MeNewsletterController:
// actúa sobre el usuario del token. Ver
// docs/features/email-first-signup-and-onboarding.md.
@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('complete')
  @ApiOperation({ summary: 'Completa los pasos 1+2 del onboarding (tipo de usuario + términos)' })
  async complete(@CurrentUser() user: User, @Body() dto: CompleteOnboardingDto) {
    const updated = await this.onboardingService.complete(user, dto)
    return toPublicUser(updated)
  }
}
