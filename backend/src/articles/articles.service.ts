import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ArticleStatus, Prisma, type User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { slugify } from '../common/slugify'
import {
  ARTICLE_INCLUDE,
  toAdminArticle,
  toPublicArticleFullFor,
  toPublicArticleSummary,
} from './articles.mapper'
import { audienceFromApi } from './audience.util'
import type { CreateArticleDto } from './dto/create-article.dto'
import type { UpdateArticleDto } from './dto/update-article.dto'
import type { QueryPublicArticlesDto } from './dto/query-public-articles.dto'
import type { QueryAdminArticlesDto } from './dto/query-admin-articles.dto'

function paginate(page?: number, pageSize?: number, maxPageSize = 100, defaultPageSize = 20) {
  const safePage = page && page > 0 ? page : 1
  const safePageSize = pageSize && pageSize > 0 ? Math.min(pageSize, maxPageSize) : defaultPageSize
  return { page: safePage, pageSize: safePageSize, skip: (safePage - 1) * safePageSize }
}

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  // ─── Público ────────────────────────────────────────────────────────────

  async findPublished(filters: QueryPublicArticlesDto) {
    const { page, pageSize, skip } = paginate(filters.page, filters.pageSize)

    const where: Prisma.ArticleWhereInput = {
      status: ArticleStatus.publicado,
      level: filters.level,
      scope: filters.scope,
      audience: filters.audience ? { has: audienceFromApi([filters.audience])[0] } : undefined,
      categories: filters.category ? { some: { category: { slug: filters.category } } } : undefined,
      ...(filters.query
        ? {
            OR: [
              { title: { contains: filters.query, mode: 'insensitive' } },
              { subtitle: { contains: filters.query, mode: 'insensitive' } },
              { excerpt: { contains: filters.query, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: ARTICLE_INCLUDE,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.article.count({ where }),
    ])

    return { items: items.map(toPublicArticleSummary), total, page, pageSize }
  }

  async findPublishedBySlug(slug: string, viewer?: User) {
    const article = await this.prisma.article.findFirst({
      where: { slug, status: ArticleStatus.publicado },
      include: ARTICLE_INCLUDE,
    })
    if (!article) throw new NotFoundException('Artículo no encontrado')
    return toPublicArticleFullFor(article, viewer)
  }

  // ─── Admin ──────────────────────────────────────────────────────────────

  async findAllAdmin(filters: QueryAdminArticlesDto) {
    const { page, pageSize, skip } = paginate(filters.page, filters.pageSize)

    const where: Prisma.ArticleWhereInput = {
      status: filters.status,
      scope: filters.scope,
      categories: filters.category ? { some: { category: { slug: filters.category } } } : undefined,
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { excerpt: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: ARTICLE_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.article.count({ where }),
    ])

    return { items: items.map(toAdminArticle), total, page, pageSize }
  }

  async findOneAdmin(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: ARTICLE_INCLUDE,
    })
    if (!article) throw new NotFoundException('Artículo no encontrado')
    return toAdminArticle(article)
  }

  async create(dto: CreateArticleDto, actor: User) {
    const slug = slugify(dto.slug ?? dto.title)
    if (!slug) throw new BadRequestException('No se pudo derivar un slug válido del título')

    const clash = await this.prisma.article.findUnique({ where: { slug } })
    if (clash) throw new ConflictException(`Ya existe un artículo con el slug "${slug}"`)

    const categoryLinks = await this.resolveCategoryLinks(dto.categorySlugs)
    const tagLinks = await this.resolveTagLinks(dto.tags ?? [])
    const status = dto.status ?? ArticleStatus.borrador

    const article = await this.prisma.article.create({
      data: {
        slug,
        title: dto.title,
        subtitle: dto.subtitle,
        excerpt: dto.excerpt,
        content: dto.content,
        coverImage: dto.coverImage,
        coverImagePublicId: dto.coverImagePublicId,
        level: dto.level,
        audience: audienceFromApi(dto.audience),
        status,
        scope: dto.scope,
        readingTime: dto.readingTime,
        // La fecha explícita (ej. "fecha" del .md importado) manda; si no
        // vino y se publica de una, se usa la fecha/hora actual.
        publishedAt: dto.publishedAt
          ? new Date(dto.publishedAt)
          : status === ArticleStatus.publicado
            ? new Date()
            : null,
        sources: (dto.sources as unknown as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        importMetadata:
          (dto.importMetadata as unknown as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        authorId: actor.id,
        categories: { create: categoryLinks },
        tags: { create: tagLinks },
      },
      include: ARTICLE_INCLUDE,
    })

    await this.audit.record({
      actorId: actor.id,
      action: 'article.create',
      entityType: 'Article',
      entityId: article.id,
    })

    return toAdminArticle(article)
  }

  async update(id: string, dto: UpdateArticleDto, actor: User) {
    const existing = await this.prisma.article.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Artículo no encontrado')

    let slug = existing.slug
    if (dto.slug !== undefined) {
      const nextSlug = slugify(dto.slug)
      if (!nextSlug) throw new BadRequestException('Slug inválido')
      if (nextSlug !== existing.slug) {
        const clash = await this.prisma.article.findUnique({ where: { slug: nextSlug } })
        if (clash) throw new ConflictException(`Ya existe un artículo con el slug "${nextSlug}"`)
        slug = nextSlug
      }
    }

    const categoryLinks = dto.categorySlugs
      ? await this.resolveCategoryLinks(dto.categorySlugs)
      : undefined
    const tagLinks = dto.tags ? await this.resolveTagLinks(dto.tags) : undefined

    const willPublishNow =
      dto.status === ArticleStatus.publicado && existing.status !== ArticleStatus.publicado

    const article = await this.prisma.article.update({
      where: { id },
      data: {
        slug,
        title: dto.title,
        subtitle: dto.subtitle,
        excerpt: dto.excerpt,
        content: dto.content,
        coverImage: dto.coverImage,
        coverImagePublicId: dto.coverImagePublicId,
        level: dto.level,
        audience: dto.audience ? audienceFromApi(dto.audience) : undefined,
        status: dto.status,
        scope: dto.scope,
        readingTime: dto.readingTime,
        // Si viene una fecha explícita (ej. al editar la "fecha" importada)
        // manda esa; si no, solo se toca al pasar A publicado por primera
        // vez — archivar/despublicar no borra la fecha histórica.
        publishedAt: dto.publishedAt
          ? new Date(dto.publishedAt)
          : willPublishNow
            ? new Date()
            : undefined,
        sources:
          dto.sources !== undefined
            ? ((dto.sources as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull)
            : undefined,
        importMetadata:
          dto.importMetadata !== undefined
            ? ((dto.importMetadata as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull)
            : undefined,
        ...(categoryLinks ? { categories: { deleteMany: {}, create: categoryLinks } } : {}),
        ...(tagLinks ? { tags: { deleteMany: {}, create: tagLinks } } : {}),
      },
      include: ARTICLE_INCLUDE,
    })

    await this.audit.record({
      actorId: actor.id,
      action: 'article.update',
      entityType: 'Article',
      entityId: id,
    })

    if (dto.status && dto.status !== existing.status) {
      const action =
        dto.status === ArticleStatus.publicado
          ? 'article.publish'
          : dto.status === ArticleStatus.archivado
            ? 'article.archive'
            : 'article.unpublish'
      await this.audit.record({
        actorId: actor.id,
        action,
        entityType: 'Article',
        entityId: id,
        metadata: { from: existing.status, to: dto.status },
      })
    }

    return toAdminArticle(article)
  }

  async remove(id: string, actor: User) {
    const existing = await this.prisma.article.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Artículo no encontrado')

    await this.prisma.article.delete({ where: { id } })

    await this.audit.record({
      actorId: actor.id,
      action: 'article.delete',
      entityType: 'Article',
      entityId: id,
      metadata: { title: existing.title, slug: existing.slug },
    })

    return { ok: true }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async resolveCategoryLinks(slugs: string[]) {
    const categories = await this.prisma.category.findMany({ where: { slug: { in: slugs } } })
    const found = new Set(categories.map((c) => c.slug))
    const missing = slugs.filter((s) => !found.has(s))
    if (missing.length) {
      throw new BadRequestException(`Categorías inexistentes: ${missing.join(', ')}`)
    }
    return categories.map((c) => ({ categoryId: c.id }))
  }

  /** findOrCreate por slug del nombre — así "TDAH" y "tdah" caen en el mismo tag. */
  private async resolveTagLinks(tagNames: string[]) {
    const links: { tagId: string }[] = []
    for (const raw of tagNames) {
      const name = raw.trim()
      if (!name) continue
      const slug = slugify(name)
      if (!slug) continue
      const tag = await this.prisma.tag.upsert({
        where: { slug },
        update: {},
        create: { slug, name },
      })
      links.push({ tagId: tag.id })
    }
    return links
  }
}
