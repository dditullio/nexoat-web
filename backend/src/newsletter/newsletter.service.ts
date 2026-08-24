import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ResendAudienceService } from './resend-audience.service'
import type { SubscribeDto } from './dto/subscribe.dto'
import type { UnsubscribeDto } from './dto/unsubscribe.dto'
import type { QuerySubscribersDto } from './dto/query-subscribers.dto'

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resendAudience: ResendAudienceService
  ) {}

  /** Idempotente: reactiva si ya existía dado de baja, no falla si ya está suscripto. */
  async subscribe(dto: SubscribeDto) {
    const subscriber = await this.prisma.newsletterSubscriber.upsert({
      where: { email: dto.email },
      update: { isActive: true, unsubscribedAt: null, source: dto.source },
      create: { email: dto.email, source: dto.source },
    })

    // Se espera (no fire-and-forget): necesitamos el id que devuelve Resend
    // para persistirlo. El propio servicio nunca lanza — si Resend falla,
    // devuelve el id que ya había (o undefined) y acá seguimos igual.
    const contactId = await this.resendAudience.upsertSubscribed(
      subscriber.email,
      subscriber.resendContactId
    )
    if (contactId && contactId !== subscriber.resendContactId) {
      await this.prisma.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: { resendContactId: contactId },
      })
    }

    return { ok: true, email: subscriber.email }
  }

  /**
   * Silencioso si el email no existe — el controller siempre responde
   * `{ ok: true }` sin importar el resultado, mismo criterio anti-
   * enumeración que `AuthService.requestPasswordReset`.
   */
  async unsubscribe(dto: UnsubscribeDto): Promise<void> {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: dto.email },
    })
    if (!subscriber) return

    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { isActive: false, unsubscribedAt: new Date() },
    })

    await this.resendAudience.markUnsubscribed(subscriber.email, subscriber.resendContactId)
  }

  async findAll(filters: QuerySubscribersDto) {
    const page = filters.page && filters.page > 0 ? filters.page : 1
    const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25

    const where: Prisma.NewsletterSubscriberWhereInput = { isActive: filters.isActive }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ])

    return { items, total, page, pageSize }
  }
}
