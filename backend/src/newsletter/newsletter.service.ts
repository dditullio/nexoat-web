import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { SubscribeDto } from './dto/subscribe.dto'
import type { QuerySubscribersDto } from './dto/query-subscribers.dto'

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotente: reactiva si ya existía dado de baja, no falla si ya está suscripto. */
  async subscribe(dto: SubscribeDto) {
    const subscriber = await this.prisma.newsletterSubscriber.upsert({
      where: { email: dto.email },
      update: { isActive: true, unsubscribedAt: null, source: dto.source },
      create: { email: dto.email, source: dto.source },
    })
    return { ok: true, email: subscriber.email }
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
