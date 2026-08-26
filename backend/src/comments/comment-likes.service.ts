import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { CommentStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class CommentLikesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve el autor, además de confirmar que el comentario existe — lo necesita `like` para bloquear el auto-like. */
  private async findLikeableComment(commentId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, status: { not: CommentStatus.eliminado } },
      select: { id: true, authorId: true },
    })
    if (!comment) throw new NotFoundException('Comentario no encontrado')
    return comment
  }

  /** Idempotente: dar like dos veces sigue siendo un solo like. No se puede dar like al propio comentario. */
  async like(commentId: string, userId: string): Promise<{ likeCount: number }> {
    const likeableComment = await this.findLikeableComment(commentId)
    if (likeableComment.authorId === userId) {
      throw new ForbiddenException('No podés darle like a tu propio comentario')
    }
    const existing = await this.prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    })
    if (existing) {
      const comment = await this.prisma.comment.findUniqueOrThrow({
        where: { id: commentId },
        select: { likeCount: true },
      })
      return { likeCount: comment.likeCount }
    }

    const [, comment] = await this.prisma.$transaction([
      this.prisma.commentLike.create({ data: { commentId, userId } }),
      this.prisma.comment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
      }),
    ])
    return { likeCount: comment.likeCount }
  }

  async unlike(commentId: string, userId: string): Promise<{ likeCount: number }> {
    await this.findLikeableComment(commentId)
    const existing = await this.prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    })
    if (!existing) {
      const comment = await this.prisma.comment.findUniqueOrThrow({
        where: { id: commentId },
        select: { likeCount: true },
      })
      return { likeCount: comment.likeCount }
    }

    const [, comment] = await this.prisma.$transaction([
      this.prisma.commentLike.delete({ where: { commentId_userId: { commentId, userId } } }),
      this.prisma.comment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
      }),
    ])
    return { likeCount: comment.likeCount }
  }
}
