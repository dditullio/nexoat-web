import { Test } from '@nestjs/testing'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { CommentStatus, Role } from '@prisma/client'
import { CommentsService } from './comments.service'
import { PrismaService } from '../prisma/prisma.service'

type MockPrisma = {
  article: { findFirst: jest.Mock }
  comment: {
    findFirst: jest.Mock
    findUnique: jest.Mock
    findMany: jest.Mock
    count: jest.Mock
    create: jest.Mock
    update: jest.Mock
  }
  commentReport: { upsert: jest.Mock }
  $transaction: jest.Mock
}

const USER = { id: 'u1', role: Role.USER } as never
const EDITOR = { id: 'editor-1', role: Role.EDITOR } as never

describe('CommentsService', () => {
  let service: CommentsService
  let prisma: MockPrisma

  beforeEach(async () => {
    prisma = {
      article: { findFirst: jest.fn() },
      comment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      commentReport: { upsert: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    }

    const module = await Test.createTestingModule({
      providers: [CommentsService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = module.get(CommentsService)
  })

  describe('create', () => {
    beforeEach(() => {
      prisma.article.findFirst.mockResolvedValue({ id: 'article-1', commentsEnabled: true })
      // Sin comentario previo del usuario: pasa el rate limit y el chequeo de duplicado.
      prisma.comment.findFirst.mockResolvedValue(null)
      prisma.comment.count.mockResolvedValue(0)
      prisma.comment.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'comment-nuevo',
          ...data,
          status: CommentStatus.visible,
          likeCount: 0,
          editedAt: null,
          createdAt: new Date(),
          author: { id: 'u1', name: 'Persona', avatarUrl: null },
        })
      )
    })

    it('responder a una respuesta hereda el rootId de la raíz del hilo, no el id de la respuesta', async () => {
      // "reply-1" ya es una respuesta: su rootId apunta a la raíz real del hilo.
      prisma.comment.findUnique.mockResolvedValue({
        id: 'reply-1',
        articleId: 'article-1',
        rootId: 'root-1',
        status: CommentStatus.visible,
      })

      await service.create('un-articulo', USER, {
        body: 'una respuesta a la respuesta',
        parentId: 'reply-1',
      })

      expect(prisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ parentId: 'reply-1', rootId: 'root-1' }),
        })
      )
    })

    it('rechaza con 403 si el artículo tiene los comentarios cerrados', async () => {
      prisma.article.findFirst.mockResolvedValue({ id: 'article-1', commentsEnabled: false })

      await expect(service.create('un-articulo', USER, { body: 'hola' })).rejects.toThrow(
        ForbiddenException
      )
      expect(prisma.comment.create).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si el usuario comentó hace menos de 30 segundos', async () => {
      prisma.comment.findFirst.mockResolvedValue({ createdAt: new Date() })

      await expect(
        service.create('un-articulo', USER, { body: 'otro comentario' })
      ).rejects.toThrow(BadRequestException)
      expect(prisma.comment.create).not.toHaveBeenCalled()
    })
  })

  describe('update / remove', () => {
    it('update rechaza con 403 si el comentario no es del usuario', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'c1',
        authorId: 'otro-usuario',
        status: CommentStatus.visible,
      })

      await expect(service.update('c1', USER, { body: 'editado' })).rejects.toThrow(
        ForbiddenException
      )
      expect(prisma.comment.update).not.toHaveBeenCalled()
    })

    it('remove rechaza con 403 a un USER que no es el autor', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'c1',
        authorId: 'otro-usuario',
        status: CommentStatus.visible,
      })

      await expect(service.remove('c1', USER)).rejects.toThrow(ForbiddenException)
      expect(prisma.comment.update).not.toHaveBeenCalled()
    })

    it('remove permite a un EDITOR borrar un comentario ajeno', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'c1',
        authorId: 'otro-usuario',
        status: CommentStatus.visible,
      })

      await service.remove('c1', EDITOR)

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: CommentStatus.eliminado, body: '' },
      })
    })

    it('remove es borrado blando: no borra la fila, solo vacía el body y cambia el estado', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'c1',
        authorId: 'u1',
        status: CommentStatus.visible,
      })

      await service.remove('c1', USER)

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: CommentStatus.eliminado, body: '' },
      })
    })
  })

  describe('listForArticle', () => {
    it('nunca trae comentarios eliminados, y el mapper nunca expone el email del autor', async () => {
      prisma.article.findFirst.mockResolvedValue({ id: 'article-1', commentsEnabled: true })
      prisma.comment.findMany.mockResolvedValue([
        {
          id: 'root-1',
          articleId: 'article-1',
          parentId: null,
          rootId: null,
          body: 'hola',
          status: CommentStatus.visible,
          likeCount: 0,
          editedAt: null,
          createdAt: new Date(),
          author: { id: 'u1', name: 'Persona', avatarUrl: null, email: 'persona@example.com' },
        },
      ])
      prisma.comment.count.mockResolvedValue(1)

      const result = await service.listForArticle('un-articulo', undefined, {})

      const rootsCall = prisma.comment.findMany.mock.calls[0][0]
      // `oculto`/`eliminado` solo sobreviven con una respuesta visible
      // colgando (decisión 8, extendida a `oculto`) — ver el `OR` del service.
      expect(rootsCall.where.OR).toEqual(
        expect.arrayContaining([
          { status: CommentStatus.visible },
          {
            status: { in: [CommentStatus.oculto, CommentStatus.eliminado] },
            replies: { some: { status: CommentStatus.visible } },
          },
        ])
      )
      expect(result.items[0]).not.toHaveProperty('author.email')
      expect(JSON.stringify(result.items[0])).not.toContain('persona@example.com')
    })

    it('el listado de respuestas de un hilo pide status `visible` exacto (nunca `oculto`)', async () => {
      prisma.article.findFirst.mockResolvedValue({ id: 'article-1', commentsEnabled: true })
      prisma.comment.findMany
        .mockResolvedValueOnce([
          {
            id: 'root-1',
            articleId: 'article-1',
            parentId: null,
            rootId: null,
            body: 'raíz',
            status: CommentStatus.visible,
            likeCount: 0,
            editedAt: null,
            createdAt: new Date(),
            author: { id: 'u1', name: 'Persona', avatarUrl: null },
          },
        ])
        .mockResolvedValueOnce([]) // respuestas del hilo
      prisma.comment.count.mockResolvedValue(1)

      await service.listForArticle('un-articulo', undefined, {})

      const repliesCall = prisma.comment.findMany.mock.calls[1][0]
      expect(repliesCall.where).toEqual({ rootId: 'root-1', status: CommentStatus.visible })
    })
  })

  describe('report', () => {
    it('reportar dos veces sigue resolviendo al mismo upsert idempotente', async () => {
      prisma.comment.findFirst.mockResolvedValue({ id: 'c1' })

      await service.report('c1', 'u2', {})
      await service.report('c1', 'u2', {})

      expect(prisma.commentReport.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ where: { commentId_userId: { commentId: 'c1', userId: 'u2' } } })
      )
      expect(prisma.commentReport.upsert).toHaveBeenCalledTimes(2)
    })

    it('lanza NotFoundException si el comentario no existe', async () => {
      prisma.comment.findFirst.mockResolvedValue(null)

      await expect(service.report('inexistente', 'u2', {})).rejects.toThrow(NotFoundException)
    })
  })
})
