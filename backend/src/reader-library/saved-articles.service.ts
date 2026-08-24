import { Injectable, NotFoundException } from '@nestjs/common'
import { ArticleStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ARTICLE_INCLUDE, toPublicArticleSummary } from '../articles/articles.mapper'
import { paginate } from './pagination.util'
import type { QueryLibraryDto } from './dto/query-library.dto'

@Injectable()
export class SavedArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  private async findPublishedArticleId(slug: string): Promise<string> {
    const article = await this.prisma.article.findFirst({
      where: { slug, status: ArticleStatus.publicado },
      select: { id: true },
    })
    if (!article) throw new NotFoundException('Artículo no encontrado')
    return article.id
  }

  /** Idempotente: guardar dos veces el mismo artículo sigue siendo una sola fila. */
  async save(userId: string, slug: string): Promise<void> {
    const articleId = await this.findPublishedArticleId(slug)
    await this.prisma.savedArticle.upsert({
      where: { userId_articleId: { userId, articleId } },
      create: { userId, articleId },
      update: {},
    })
  }

  async unsave(userId: string, slug: string): Promise<void> {
    const articleId = await this.findPublishedArticleId(slug)
    await this.prisma.savedArticle.deleteMany({ where: { userId, articleId } })
  }

  /** Para que el botón de "guardar" en ArticleView sepa su estado inicial al montar. */
  async status(userId: string, slug: string): Promise<{ saved: boolean }> {
    const articleId = await this.findPublishedArticleId(slug)
    const entry = await this.prisma.savedArticle.findUnique({
      where: { userId_articleId: { userId, articleId } },
      select: { id: true },
    })
    return { saved: !!entry }
  }

  async list(userId: string, query: QueryLibraryDto) {
    const { page, pageSize, skip } = paginate(query.page, query.pageSize)

    const where = { userId, article: { status: ArticleStatus.publicado } }

    const [entries, total] = await this.prisma.$transaction([
      this.prisma.savedArticle.findMany({
        where,
        include: { article: { include: ARTICLE_INCLUDE } },
        orderBy: { savedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.savedArticle.count({ where }),
    ])

    return {
      items: entries.map((entry) => ({
        id: entry.id,
        savedAt: entry.savedAt.toISOString(),
        article: toPublicArticleSummary(entry.article),
      })),
      total,
      page,
      pageSize,
    }
  }
}
