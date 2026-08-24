import { Test } from '@nestjs/testing'
import { ReadingHistoryService } from './reading-history.service'
import { PrismaService } from '../prisma/prisma.service'

type MockPrisma = {
  readingHistoryEntry: {
    upsert: jest.Mock
    findMany: jest.Mock
    count: jest.Mock
    deleteMany: jest.Mock
  }
  $transaction: jest.Mock
}

describe('ReadingHistoryService', () => {
  let service: ReadingHistoryService
  let prisma: MockPrisma

  beforeEach(async () => {
    prisma = {
      readingHistoryEntry: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    }

    const module = await Test.createTestingModule({
      providers: [ReadingHistoryService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = module.get(ReadingHistoryService)
  })

  it('record hace upsert por (userId, articleId), no crea duplicados al releer', async () => {
    await service.record('u1', 'a1')

    expect(prisma.readingHistoryEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_articleId: { userId: 'u1', articleId: 'a1' } } })
    )
  })

  it('removeOne borra por (id, userId) — no puede tocar una entrada ajena', async () => {
    prisma.readingHistoryEntry.deleteMany.mockResolvedValue({ count: 0 })

    await service.removeOne('u1', 'entry-de-otro-usuario')

    expect(prisma.readingHistoryEntry.deleteMany).toHaveBeenCalledWith({
      where: { id: 'entry-de-otro-usuario', userId: 'u1' },
    })
  })

  it('clear borra todas las entradas del usuario', async () => {
    prisma.readingHistoryEntry.deleteMany.mockResolvedValue({ count: 3 })

    await service.clear('u1')

    expect(prisma.readingHistoryEntry.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
  })

  it('list solo trae artículos publicados, ordenados por readAt descendente', async () => {
    prisma.readingHistoryEntry.findMany.mockResolvedValue([])
    prisma.readingHistoryEntry.count.mockResolvedValue(0)

    await service.list('u1', {})

    const call = prisma.readingHistoryEntry.findMany.mock.calls[0][0]
    expect(call.where).toEqual({ userId: 'u1', article: { status: 'publicado' } })
    expect(call.orderBy).toEqual({ readAt: 'desc' })
  })
})
