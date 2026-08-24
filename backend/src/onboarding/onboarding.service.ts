import { BadRequestException, Injectable } from '@nestjs/common'
import type { User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { NewsletterService } from '../newsletter/newsletter.service'
import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto'

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly newsletter: NewsletterService
  ) {}

  /**
   * Pasos 1+2 del onboarding en un solo request atómico — mientras esto no
   * se llame, `onboardingCompletedAt` sigue en null y el guard del router
   * sigue mandando de vuelta a /bienvenida. Ver
   * docs/features/email-first-signup-and-onboarding.md, decisión 6.
   */
  async complete(user: User, dto: CompleteOnboardingDto): Promise<User> {
    if (!dto.acceptedTerms) {
      throw new BadRequestException('Hace falta aceptar los términos para continuar')
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        profileRole: dto.profileRole,
        termsAcceptedAt: new Date(),
        onboardingCompletedAt: new Date(),
      },
    })

    if (dto.subscribeNewsletter) {
      // No bloquea el onboarding si Resend falla — subscribe() ya maneja
      // ese caso internamente (ver docs/features/email-provider-resend.md).
      await this.newsletter.subscribe({ email: updated.email, source: 'onboarding' })
    }

    return updated
  }
}
