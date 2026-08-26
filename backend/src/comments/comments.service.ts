import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ArticleStatus, CommentStatus, Role, type User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { paginate } from '../reader-library/pagination.util'
import { COMMENT_AUTHOR_SELECT, toPublicComment } from './comments.mapper'
import type { CreateCommentDto } from './dto/create-comment.dto'
import type { UpdateCommentDto } from './dto/update-comment.dto'
import type { QueryCommentsDto } from './dto/query-comments.dto'
import type { ReportCommentDto } from './dto/report-comment.dto'

/** Respuestas embebidas por hilo en el listado principal — ver decisión 2. */
const EMBEDDED_REPLIES_PER_THREAD = 3
/** Anti-spam mínimo, sin dependencia externa — ver docs/features/article-comments.md, decisión 10. */
const MIN_SECONDS_BETWEEN_COMMENTS = 30
const MAX_COMMENTS_PER_DAY = 20

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async findPublishedArticle(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { slug, status: ArticleStatus.publicado },
      select: { id: true, commentsEnabled: true },
    })
    if (!article) throw new NotFoundException('Artículo no encontrado')
    return article
  }

  private async assertRateLimit(userId: string): Promise<void> {
    const since = new Date(Date.now() - MIN_SECONDS_BETWEEN_COMMENTS * 1000)
    const [lastComment, todayCount] = await Promise.all([
      this.prisma.comment.findFirst({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.comment.count({
        where: { authorId: userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ])
    if (lastComment && lastComment.createdAt > since) {
      throw new BadRequestException(
        'Estás comentando muy rápido — esperá unos segundos y volvé a intentar.'
      )
    }
    if (todayCount >= MAX_COMMENTS_PER_DAY) {
      throw new BadRequestException('Alcanzaste el límite diario de comentarios.')
    }
  }

  async create(slug: string, user: User, dto: CreateCommentDto) {
    const article = await this.findPublishedArticle(slug)
    if (!article.commentsEnabled) {
      throw new ForbiddenException('Los comentarios de este artículo están cerrados')
    }

    let rootId: string | null = null
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, articleId: true, rootId: true, status: true },
      })
      if (!parent || parent.articleId !== article.id) {
        throw new NotFoundException('El comentario al que respondés no existe en este artículo')
      }
      rootId = parent.rootId ?? parent.id
    }

    await this.assertRateLimit(user.id)

    // Rechaza el doble-click / flood tonto: mismo texto, mismo artículo,
    // mismo autor, que su comentario inmediatamente anterior.
    const lastOwn = await this.prisma.comment.findFirst({
      where: { authorId: user.id, articleId: article.id },
      orderBy: { createdAt: 'desc' },
      select: { body: true },
    })
    if (lastOwn && lastOwn.body === dto.body) {
      throw new BadRequestException('Ya enviaste ese mismo comentario')
    }

    const comment = await this.prisma.comment.create({
      data: {
        articleId: article.id,
        authorId: user.id,
        body: dto.body,
        parentId: dto.parentId,
        rootId,
      },
      include: { author: { select: COMMENT_AUTHOR_SELECT } },
    })
    return toPublicComment(comment, user.id)
  }

  async update(commentId: string, user: User, dto: UpdateCommentDto) {
    const existing = await this.prisma.comment.findUnique({ where: { id: commentId } })
    if (!existing || existing.status === CommentStatus.eliminado) {
      throw new NotFoundException('Comentario no encontrado')
    }
    if (existing.authorId !== user.id) {
      throw new ForbiddenException('Solo podés editar tus propios comentarios')
    }
    const comment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { body: dto.body, editedAt: new Date() },
      include: { author: { select: COMMENT_AUTHOR_SELECT } },
    })
    return toPublicComment(comment, user.id)
  }

  /** Borrado blando (decisión 8): vacía el body en vez de borrar la fila, para no romper hilos con respuestas. */
  async remove(commentId: string, user: User): Promise<void> {
    const existing = await this.prisma.comment.findUnique({ where: { id: commentId } })
    if (!existing || existing.status === CommentStatus.eliminado) {
      throw new NotFoundException('Comentario no encontrado')
    }
    const isOwner = existing.authorId === user.id
    const isModerator =
      user.role === Role.EDITOR || user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN
    if (!isOwner && !isModerator) {
      throw new ForbiddenException('No podés borrar este comentario')
    }
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { status: CommentStatus.eliminado, body: '' },
    })
  }

  /** Raíces paginadas + hasta EMBEDDED_REPLIES_PER_THREAD respuestas por hilo. */
  async listForArticle(slug: string, viewer: User | undefined, query: QueryCommentsDto) {
    const article = await this.findPublishedArticle(slug)
    const { page, pageSize, skip } = paginate(query.page, query.pageSize, 50, 10)

    // `oculto` y `eliminado` nunca muestran su body/autor (ver
    // toPublicComment) — pero ninguno de los dos debería arrastrar consigo
    // las respuestas visibles de otros usuarios al ocultarse/borrarse. Por
    // eso ambos sobreviven al fetch fresco de cualquier visitante (no solo
    // la sesión de quien borró/moderó) si todavía tienen alguna respuesta
    // visible colgando — ahí es donde se ve el hueco (decisión 8, extendida
    // a `oculto`). Sin respuestas visibles, ambos se excluyen del todo.
    const rootsWhere = {
      articleId: article.id,
      parentId: null,
      OR: [
        { status: CommentStatus.visible },
        {
          status: { in: [CommentStatus.oculto, CommentStatus.eliminado] },
          replies: { some: { status: CommentStatus.visible } },
        },
      ],
    }

    const [roots, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: rootsWhere,
        include: {
          author: { select: COMMENT_AUTHOR_SELECT },
          likes: viewer ? { where: { userId: viewer.id }, select: { userId: true } } : false,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.comment.count({ where: rootsWhere }),
    ])

    const threads = await Promise.all(
      roots.map(async (root) => {
        // Las respuestas sí son estrictamente `visible` — a diferencia de la
        // raíz, no se sostiene un hueco de "respuesta eliminada" (ver
        // decisión 8: simplificación aceptada, la respuesta desaparece del
        // todo del listado plano).
        const repliesWhere = { rootId: root.id, status: CommentStatus.visible }
        const [replies, replyCount] = await this.prisma.$transaction([
          this.prisma.comment.findMany({
            where: repliesWhere,
            include: {
              author: { select: COMMENT_AUTHOR_SELECT },
              likes: viewer ? { where: { userId: viewer.id }, select: { userId: true } } : false,
            },
            orderBy: { createdAt: 'asc' },
            take: EMBEDDED_REPLIES_PER_THREAD,
          }),
          this.prisma.comment.count({ where: repliesWhere }),
        ])
        return {
          ...toPublicComment(root, viewer?.id),
          replies: replies.map((r) => toPublicComment(r, viewer?.id)),
          replyCount,
        }
      })
    )

    return {
      items: threads,
      total,
      page,
      pageSize,
      commentsEnabled: article.commentsEnabled,
    }
  }

  /** Resto de las respuestas de un hilo, más allá de las embebidas en listForArticle. */
  async listReplies(rootId: string, viewer: User | undefined, skip: number) {
    const replies = await this.prisma.comment.findMany({
      where: { rootId, status: CommentStatus.visible },
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        likes: viewer ? { where: { userId: viewer.id }, select: { userId: true } } : false,
      },
      orderBy: { createdAt: 'asc' },
      skip: Math.max(skip, 0),
      take: EMBEDDED_REPLIES_PER_THREAD * 3,
    })
    return replies.map((r) => toPublicComment(r, viewer?.id))
  }

  /** Idempotente (@@unique en CommentReport): reportar dos veces sigue siendo un solo reporte. */
  async report(commentId: string, userId: string, dto: ReportCommentDto): Promise<void> {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, status: { not: CommentStatus.eliminado } },
      select: { id: true },
    })
    if (!comment) throw new NotFoundException('Comentario no encontrado')

    await this.prisma.commentReport.upsert({
      where: { commentId_userId: { commentId, userId } },
      create: { commentId, userId, reason: dto.reason },
      update: {},
    })
  }

  async listMine(userId: string, query: QueryCommentsDto) {
    const { page, pageSize, skip } = paginate(query.page, query.pageSize, 50, 20)
    const where = { authorId: userId, status: { not: CommentStatus.eliminado } }

    const [comments, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        include: { article: { select: { slug: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.comment.count({ where }),
    ])

    return {
      items: comments.map((c) => ({
        id: c.id,
        body: c.body,
        likeCount: c.likeCount,
        createdAt: c.createdAt.toISOString(),
        editedAt: c.editedAt ? c.editedAt.toISOString() : null,
        article: { slug: c.article.slug, title: c.article.title },
      })),
      total,
      page,
      pageSize,
    }
  }
}
