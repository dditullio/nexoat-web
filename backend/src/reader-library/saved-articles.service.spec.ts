import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { SavedArticlesService } from './saved-articles.service'
import { PrismaService } from '../prisma/prisma.service'

type MockPrisma = {
  article: { findFirst: jest.Mock }
  savedArticle: {
    upsert: jest.Mock
    findUnique: jest.Mock
    findMany: jest.Mock
    count: jest.Mock
    deleteMany: jest.Mock
  }
  $transaction: jest.Mock
}

describe('SavedArticlesService', () => {
  let service: SavedArticlesService
  let prisma: MockPrisma

  beforeEach(async () => {
    prisma = {
      article: { findFirst: jest.fn() },
      savedArticle: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    }

    const module = await Test.createTestingModule({
      providers: [SavedArticlesService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = module.get(SavedArticlesService)
  })

  it('save lanza NotFoundException si el slug no existe o no está publicado', async () => {
    prisma.article.findFirst.mockResolvedValue(null)

    await expect(service.save('u1', 'slug-inexistente')).rejects.toThrow(NotFoundException)
    expect(prisma.savedArticle.upsert).not.toHaveBeenCalled()
  })

  it('save es idempotente: guardar dos veces resuelve al mismo upsert por (userId, articleId)', async () => {
    prisma.article.findFirst.mockResolvedValue({ id: 'a1' })

    await service.save('u1', 'un-articulo')
    await service.save('u1', 'un-articulo')

    expect(prisma.savedArticle.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { userId_articleId: { userId: 'u1', articleId: 'a1' } } })
    )
    expect(prisma.savedArticle.upsert).toHaveBeenCalledTimes(2)
  })

  it('status devuelve saved:true si existe la fila, false si no', async () => {
    prisma.article.findFirst.mockResolvedValue({ id: 'a1' })
    prisma.savedArticle.findUnique.mockResolvedValue({ id: 'entry-1' })

    await expect(service.status('u1', 'un-articulo')).resolves.toEqual({ saved: true })

    prisma.savedArticle.findUnique.mockResolvedValue(null)
    await expect(service.status('u1', 'un-articulo')).resolves.toEqual({ saved: false })
  })

  it('unsave borra por (userId, articleId) resuelto desde el slug', async () => {
    prisma.article.findFirst.mockResolvedValue({ id: 'a1' })

    await service.unsave('u1', 'un-articulo')

    expect(prisma.savedArticle.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', articleId: 'a1' },
    })
  })

  it('list solo trae artículos publicados, ordenados por savedAt descendente', async () => {
    prisma.savedArticle.findMany.mockResolvedValue([])
    prisma.savedArticle.count.mockResolvedValue(0)

    await service.list('u1', {})

    const call = prisma.savedArticle.findMany.mock.calls[0][0]
    expect(call.where).toEqual({ userId: 'u1', article: { status: 'publicado' } })
    expect(call.orderBy).toEqual({ savedAt: 'desc' })
  })
})
