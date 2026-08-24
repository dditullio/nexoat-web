import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { ProfileRole, type User } from '@prisma/client'
import { OnboardingService } from './onboarding.service'
import { PrismaService } from '../prisma/prisma.service'
import { NewsletterService } from '../newsletter/newsletter.service'

type MockPrisma = {
  user: { update: jest.Mock }
}

describe('OnboardingService', () => {
  let service: OnboardingService
  let prisma: MockPrisma
  let newsletter: { subscribe: jest.Mock }

  const user = { id: 'u1', email: 'x@x.com' } as User

  beforeEach(async () => {
    prisma = { user: { update: jest.fn() } }
    newsletter = { subscribe: jest.fn().mockResolvedValue({ ok: true, email: 'x@x.com' }) }

    const module = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: prisma },
        { provide: NewsletterService, useValue: newsletter },
      ],
    }).compile()

    service = module.get(OnboardingService)
  })

  it('rechaza si acceptedTerms no es true, sin tocar la DB', async () => {
    await expect(
      service.complete(user, {
        profileRole: ProfileRole.familiar,
        acceptedTerms: false,
        subscribeNewsletter: false,
      })
    ).rejects.toThrow(BadRequestException)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('setea profileRole, termsAcceptedAt y onboardingCompletedAt', async () => {
    prisma.user.update.mockResolvedValue({ ...user, profileRole: ProfileRole.cuidador })

    await service.complete(user, {
      profileRole: ProfileRole.cuidador,
      acceptedTerms: true,
      subscribeNewsletter: false,
    })

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        profileRole: ProfileRole.cuidador,
        termsAcceptedAt: expect.any(Date),
        onboardingCompletedAt: expect.any(Date),
      },
    })
  })

  it('no suscribe al newsletter si subscribeNewsletter es false', async () => {
    prisma.user.update.mockResolvedValue(user)

    await service.complete(user, {
      profileRole: ProfileRole.otro,
      acceptedTerms: true,
      subscribeNewsletter: false,
    })

    expect(newsletter.subscribe).not.toHaveBeenCalled()
  })

  it('suscribe al newsletter con source "onboarding" si subscribeNewsletter es true', async () => {
    prisma.user.update.mockResolvedValue(user)

    await service.complete(user, {
      profileRole: ProfileRole.otro,
      acceptedTerms: true,
      subscribeNewsletter: true,
    })

    expect(newsletter.subscribe).toHaveBeenCalledWith({ email: 'x@x.com', source: 'onboarding' })
  })
})
