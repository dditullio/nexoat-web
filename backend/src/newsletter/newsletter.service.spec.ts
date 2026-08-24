import { Test } from '@nestjs/testing'
import { NewsletterService } from './newsletter.service'
import { PrismaService } from '../prisma/prisma.service'
import { ResendAudienceService } from './resend-audience.service'

type MockPrisma = {
  newsletterSubscriber: {
    upsert: jest.Mock
    update: jest.Mock
    findUnique: jest.Mock
    findMany: jest.Mock
    count: jest.Mock
  }
  $transaction: jest.Mock
}

describe('NewsletterService', () => {
  let service: NewsletterService
  let prisma: MockPrisma
  let resendAudience: { upsertSubscribed: jest.Mock; markUnsubscribed: jest.Mock }

  beforeEach(async () => {
    prisma = {
      newsletterSubscriber: {
        upsert: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    }
    resendAudience = {
      upsertSubscribed: jest.fn().mockResolvedValue(undefined),
      markUnsubscribed: jest.fn().mockResolvedValue(undefined),
    }

    const module = await Test.createTestingModule({
      providers: [
        NewsletterService,
        { provide: PrismaService, useValue: prisma },
        { provide: ResendAudienceService, useValue: resendAudience },
      ],
    }).compile()

    service = module.get(NewsletterService)
  })

  describe('subscribe', () => {
    it('sincroniza con Resend y persiste el resendContactId devuelto', async () => {
      prisma.newsletterSubscriber.upsert.mockResolvedValue({
        id: 's1',
        email: 'x@x.com',
        resendContactId: null,
      })
      resendAudience.upsertSubscribed.mockResolvedValue('contact-nuevo')

      await service.subscribe({ email: 'x@x.com' })

      expect(resendAudience.upsertSubscribed).toHaveBeenCalledWith('x@x.com', null)
      expect(prisma.newsletterSubscriber.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { resendContactId: 'contact-nuevo' },
      })
    })

    it('no vuelve a persistir si el resendContactId no cambió', async () => {
      prisma.newsletterSubscriber.upsert.mockResolvedValue({
        id: 's1',
        email: 'x@x.com',
        resendContactId: 'contact-1',
      })
      resendAudience.upsertSubscribed.mockResolvedValue('contact-1')

      await service.subscribe({ email: 'x@x.com' })

      expect(prisma.newsletterSubscriber.update).not.toHaveBeenCalled()
    })

    it('no rompe el alta si Resend no devuelve ningún id (sync apagada/falló)', async () => {
      prisma.newsletterSubscriber.upsert.mockResolvedValue({
        id: 's1',
        email: 'x@x.com',
        resendContactId: null,
      })
      resendAudience.upsertSubscribed.mockResolvedValue(undefined)

      const result = await service.subscribe({ email: 'x@x.com' })

      expect(result).toEqual({ ok: true, email: 'x@x.com' })
      expect(prisma.newsletterSubscriber.update).not.toHaveBeenCalled()
    })
  })

  describe('unsubscribe', () => {
    it('no hace nada si el email no existe (evita enumeración vía efectos observables)', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue(null)

      await service.unsubscribe({ email: 'nadie@x.com' })

      expect(prisma.newsletterSubscriber.update).not.toHaveBeenCalled()
      expect(resendAudience.markUnsubscribed).not.toHaveBeenCalled()
    })

    it('marca inactivo localmente y sincroniza la baja con Resend', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue({
        id: 's1',
        email: 'x@x.com',
        resendContactId: 'contact-1',
      })

      await service.unsubscribe({ email: 'x@x.com' })

      expect(prisma.newsletterSubscriber.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { isActive: false, unsubscribedAt: expect.any(Date) },
      })
      expect(resendAudience.markUnsubscribed).toHaveBeenCalledWith('x@x.com', 'contact-1')
    })
  })

  describe('getStatus', () => {
    it('devuelve subscribed:false si el email nunca se suscribió', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue(null)
      await expect(service.getStatus('nadie@x.com')).resolves.toEqual({ subscribed: false })
    })

    it('devuelve subscribed:false si se dio de baja', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue({ isActive: false })
      await expect(service.getStatus('x@x.com')).resolves.toEqual({ subscribed: false })
    })

    it('devuelve subscribed:true si está activo', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue({ isActive: true })
      await expect(service.getStatus('x@x.com')).resolves.toEqual({ subscribed: true })
    })
  })
})
