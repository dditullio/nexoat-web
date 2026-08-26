import { Test } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { CommentStatus } from '@prisma/client'
import { CommentLikesService } from './comment-likes.service'
import { PrismaService } from '../prisma/prisma.service'

type MockPrisma = {
  comment: { findFirst: jest.Mock; findUniqueOrThrow: jest.Mock }
  commentLike: { findUnique: jest.Mock; create: jest.Mock; delete: jest.Mock }
  $transaction: jest.Mock
}

describe('CommentLikesService', () => {
  let service: CommentLikesService
  let prisma: MockPrisma

  beforeEach(async () => {
    prisma = {
      comment: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
      commentLike: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    }

    const module = await Test.createTestingModule({
      providers: [CommentLikesService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = module.get(CommentLikesService)
  })

  it('like lanza NotFoundException si el comentario no existe o está eliminado', async () => {
    prisma.comment.findFirst.mockResolvedValue(null)

    await expect(service.like('c1', 'u1')).rejects.toThrow(NotFoundException)
    expect(prisma.commentLike.create).not.toHaveBeenCalled()
  })

  it('like lanza ForbiddenException si el usuario es el autor del comentario', async () => {
    prisma.comment.findFirst.mockResolvedValue({ id: 'c1', authorId: 'u1' })

    await expect(service.like('c1', 'u1')).rejects.toThrow(ForbiddenException)
    expect(prisma.commentLike.create).not.toHaveBeenCalled()
  })

  it('like es idempotente: dos likes seguidos del mismo usuario dejan likeCount en 1, no 2', async () => {
    prisma.comment.findFirst.mockResolvedValue({ id: 'c1', authorId: 'otro-usuario' })
    prisma.commentLike.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'like-1' })
    prisma.commentLike.create.mockResolvedValue({ id: 'like-1' })
    let likeCount = 0
    prisma.comment.findUniqueOrThrow.mockImplementation(() => Promise.resolve({ likeCount }))
    ;(prisma as unknown as { comment: { update: jest.Mock } }).comment.update = jest
      .fn()
      .mockImplementation(() => {
        likeCount += 1
        return Promise.resolve({ likeCount })
      })

    const first = await service.like('c1', 'u1')
    const second = await service.like('c1', 'u1')

    expect(first.likeCount).toBe(1)
    expect(second.likeCount).toBe(1)
    expect(prisma.commentLike.create).toHaveBeenCalledTimes(1)
  })

  it('unlike sin like previo no hace nada y devuelve el likeCount actual', async () => {
    prisma.comment.findFirst.mockResolvedValue({ id: 'c1', status: CommentStatus.visible })
    prisma.commentLike.findUnique.mockResolvedValue(null)
    prisma.comment.findUniqueOrThrow.mockResolvedValue({ likeCount: 0 })

    const result = await service.unlike('c1', 'u1')

    expect(result).toEqual({ likeCount: 0 })
    expect(prisma.commentLike.delete).not.toHaveBeenCalled()
  })
})
