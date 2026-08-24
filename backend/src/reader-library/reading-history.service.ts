import { Injectable } from '@nestjs/common'
import { ArticleStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ARTICLE_INCLUDE, toPublicArticleSummary } from '../articles/articles.mapper'
import { paginate } from './pagination.util'
import type { QueryLibraryDto } from './dto/query-library.dto'

@Injectable()
export class ReadingHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Un ítem por artículo (no un log de cada visita) — upsert que actualiza
   * `readAt`. Se llama desde ArticlesService.findPublishedBySlug; nunca
   * debe tirar abajo la respuesta al lector si falla, ver el catch en el
   * caller. Ver docs/features/reader-history-and-saved-articles.md.
   */
  async record(userId: string, articleId: string): Promise<void> {
    await this.prisma.readingHistoryEntry.upsert({
      where: { userId_articleId: { userId, articleId } },
      create: { userId, articleId },
      update: { readAt: new Date() },
    })
  }

  async list(userId: string, query: QueryLibraryDto) {
    const { page, pageSize, skip } = paginate(query.page, query.pageSize)

    const where = { userId, article: { status: ArticleStatus.publicado } }

    const [entries, total] = await this.prisma.$transaction([
      this.prisma.readingHistoryEntry.findMany({
        where,
        include: { article: { include: ARTICLE_INCLUDE } },
        orderBy: { readAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.readingHistoryEntry.count({ where }),
    ])

    return {
      items: entries.map((entry) => ({
        id: entry.id,
        readAt: entry.readAt.toISOString(),
        article: toPublicArticleSummary(entry.article),
      })),
      total,
      page,
      pageSize,
    }
  }

  /** deleteMany (no delete) con `userId` en el where: nunca borra una entrada ajena, ni revela si existe. */
  async removeOne(userId: string, entryId: string): Promise<void> {
    await this.prisma.readingHistoryEntry.deleteMany({ where: { id: entryId, userId } })
  }

  async clear(userId: string): Promise<void> {
    await this.prisma.readingHistoryEntry.deleteMany({ where: { userId } })
  }
}
