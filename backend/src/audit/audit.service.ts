import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface RecordAuditEntry {
  actorId?: string | null
  action: string // ej: "article.publish", "user.role_change"
  entityType?: string // ej: "Article", "User"
  entityId?: string
  metadata?: Prisma.InputJsonValue
  ip?: string
}

export interface AuditLogFilters {
  actorId?: string
  entityType?: string
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

/**
 * Se invoca explícitamente desde los services que mutan estado (users,
 * articles) — nunca vía interceptor automático, para que quede claro en
 * cada service qué se está auditando y con qué metadata. No se audita
 * tráfico de lectura.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: RecordAuditEntry) {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
        ip: entry.ip,
      },
    })
  }

  async findAll(filters: AuditLogFilters) {
    const page = filters.page && filters.page > 0 ? filters.page : 1
    const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25

    const where: Prisma.AuditLogWhereInput = {
      actorId: filters.actorId,
      entityType: filters.entityType,
      createdAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return { items, total, page, pageSize }
  }
}
