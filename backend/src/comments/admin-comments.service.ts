import { Injectable, NotFoundException } from '@nestjs/common'
import { CommentStatus, Prisma, type User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { paginate } from '../reader-library/pagination.util'
import { toAdminComment } from './comments.mapper'
import type { QueryAdminCommentsDto } from './dto/query-admin-comments.dto'
import type { ModerateCommentDto } from './dto/moderate-comment.dto'

const ADMIN_COMMENT_INCLUDE = {
  author: { select: { id: true, name: true, email: true, avatarUrl: true } },
  article: { select: { slug: true, title: true } },
  _count: { select: { reports: true } },
} satisfies Prisma.CommentInclude

@Injectable()
export class AdminCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async findAll(query: QueryAdminCommentsDto) {
    const { page, pageSize, skip } = paginate(query.page, query.pageSize, 100, 25)

    const where: Prisma.CommentWhereInput = {
      status: query.status,
      articleId: query.articleId,
      body: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
      reports: query.reported ? { some: {} } : undefined,
    }

    const [comments, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        include: ADMIN_COMMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.comment.count({ where }),
    ])

    return { items: comments.map(toAdminComment), total, page, pageSize }
  }

  async setStatus(commentId: string, dto: ModerateCommentDto, actor: User): Promise<void> {
    const existing = await this.prisma.comment.findUnique({ where: { id: commentId } })
    if (!existing) throw new NotFoundException('Comentario no encontrado')

    await this.prisma.comment.update({ where: { id: commentId }, data: { status: dto.status } })
    await this.audit.record({
      actorId: actor.id,
      action: dto.status === CommentStatus.oculto ? 'comment.hide' : 'comment.restore',
      entityType: 'Comment',
      entityId: commentId,
    })
  }

  /** Borrado blando, igual criterio que CommentsService.remove — vacía el body, no borra la fila. */
  async remove(commentId: string, actor: User): Promise<void> {
    const existing = await this.prisma.comment.findUnique({ where: { id: commentId } })
    if (!existing) throw new NotFoundException('Comentario no encontrado')

    await this.prisma.comment.update({
      where: { id: commentId },
      data: { status: CommentStatus.eliminado, body: '' },
    })
    await this.audit.record({
      actorId: actor.id,
      action: 'comment.delete',
      entityType: 'Comment',
      entityId: commentId,
    })
  }
}
