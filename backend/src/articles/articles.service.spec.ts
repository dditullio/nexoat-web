import { Test } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { ArticleStatus, Level, type User } from '@prisma/client'
import { ArticlesService } from './articles.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { CreateArticleDto } from './dto/create-article.dto'

type MockPrisma = {
  article: {
    findUnique: jest.Mock
    findFirst: jest.Mock
    findMany: jest.Mock
    create: jest.Mock
    update: jest.Mock
    delete: jest.Mock
    count: jest.Mock
  }
  category: { findMany: jest.Mock }
  tag: { upsert: jest.Mock }
  $transaction: jest.Mock
}

describe('ArticlesService', () => {
  let service: ArticlesService
  let prisma: MockPrisma
  let audit: { record: jest.Mock }

  const actor = { id: 'author-1' } as User

  const baseDto: CreateArticleDto = {
    title: 'Un artículo de prueba',
    content: 'contenido',
    level: Level.basico,
    audience: ['profesionales'],
    categorySlugs: ['salud-mental'],
  }

  beforeEach(async () => {
    prisma = {
      article: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      category: { findMany: jest.fn() },
      tag: { upsert: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    }
    audit = { record: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile()

    service = module.get(ArticlesService)
  })

  describe('create', () => {
    it('lanza BadRequestException si alguna categoría no existe', async () => {
      prisma.article.findUnique.mockResolvedValue(null)
      prisma.category.findMany.mockResolvedValue([]) // ninguna categoría matcheó

      await expect(service.create(baseDto, actor)).rejects.toThrow(BadRequestException)
    })

    it('lanza ConflictException si ya existe un artículo con ese slug', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(service.create(baseDto, actor)).rejects.toThrow(ConflictException)
    })

    it('setea publishedAt y audita "article.create" cuando status es publicado', async () => {
      prisma.article.findUnique.mockResolvedValue(null)
      prisma.category.findMany.mockResolvedValue([{ id: 'cat-1', slug: 'salud-mental' }])
      prisma.article.create.mockImplementation(({ data }) => ({
        ...data,
        id: 'art-1',
        categories: [],
        tags: [],
        author: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      await service.create({ ...baseDto, status: ArticleStatus.publicado }, actor)

      const createArgs = prisma.article.create.mock.calls[0][0]
      expect(createArgs.data.publishedAt).toBeInstanceOf(Date)
      expect(createArgs.data.authorId).toBe('author-1')
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'article.create', entityId: 'art-1' })
      )
    })

    it('no setea publishedAt cuando queda en borrador', async () => {
      prisma.article.findUnique.mockResolvedValue(null)
      prisma.category.findMany.mockResolvedValue([{ id: 'cat-1', slug: 'salud-mental' }])
      prisma.article.create.mockImplementation(({ data }) => ({
        ...data,
        id: 'art-1',
        categories: [],
        tags: [],
        author: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      await service.create(baseDto, actor)

      const createArgs = prisma.article.create.mock.calls[0][0]
      expect(createArgs.data.publishedAt).toBeNull()
    })

    it('usa publishedAt explícito (ej. la "fecha" del .md importado) en vez de la fecha actual', async () => {
      prisma.article.findUnique.mockResolvedValue(null)
      prisma.category.findMany.mockResolvedValue([{ id: 'cat-1', slug: 'salud-mental' }])
      prisma.article.create.mockImplementation(({ data }) => ({
        ...data,
        id: 'art-1',
        categories: [],
        tags: [],
        author: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      await service.create(
        { ...baseDto, status: ArticleStatus.publicado, publishedAt: '2026-06-16' },
        actor
      )

      const createArgs = prisma.article.create.mock.calls[0][0]
      expect(createArgs.data.publishedAt).toEqual(new Date('2026-06-16'))
    })

    it('guarda sources e importMetadata cuando vienen en el dto', async () => {
      prisma.article.findUnique.mockResolvedValue(null)
      prisma.category.findMany.mockResolvedValue([{ id: 'cat-1', slug: 'salud-mental' }])
      prisma.article.create.mockImplementation(({ data }) => ({
        ...data,
        id: 'art-1',
        categories: [],
        tags: [],
        author: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      const sources = [{ title: 'Fuente', url: 'https://ejemplo.org', description: 'desc' }]
      await service.create({ ...baseDto, sources, importMetadata: { estado: 'revisado' } }, actor)

      const createArgs = prisma.article.create.mock.calls[0][0]
      expect(createArgs.data.sources).toEqual(sources)
      expect(createArgs.data.importMetadata).toEqual({ estado: 'revisado' })
    })
  })

  describe('update', () => {
    it('lanza NotFoundException si el artículo no existe', async () => {
      prisma.article.findUnique.mockResolvedValue(null)
      await expect(service.update('missing', {}, actor)).rejects.toThrow(NotFoundException)
    })

    it('audita "article.publish" al pasar de borrador a publicado', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: 'art-1',
        slug: 'un-articulo',
        status: ArticleStatus.borrador,
      })
      prisma.article.update.mockImplementation(({ data }) => ({
        ...data,
        // Prisma omite del resultado los campos no tocados por `data`
        // (quedan como estaban en DB) — acá el test solo cambia `status`,
        // el service manda `audience: undefined` en ese caso, así que el
        // mock simula el valor ya persistido en vez de `undefined`.
        audience: data.audience ?? ['profesionales'],
        id: 'art-1',
        categories: [],
        tags: [],
        author: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      await service.update('art-1', { status: ArticleStatus.publicado }, actor)

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'article.publish' })
      )
    })
  })

  describe('remove', () => {
    it('lanza NotFoundException si el artículo no existe', async () => {
      prisma.article.findUnique.mockResolvedValue(null)
      await expect(service.remove('missing', actor)).rejects.toThrow(NotFoundException)
    })

    it('borra y audita "article.delete"', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'art-1', title: 'X', slug: 'x' })
      prisma.article.delete.mockResolvedValue({})

      const result = await service.remove('art-1', actor)

      expect(result).toEqual({ ok: true })
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'article.delete', entityId: 'art-1' })
      )
    })
  })
})
