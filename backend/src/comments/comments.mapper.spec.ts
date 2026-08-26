import { toPublicComment, type CommentWithAuthor } from './comments.mapper'

function makeComment(overrides: Partial<CommentWithAuthor> = {}): CommentWithAuthor {
  return {
    id: 'c1',
    articleId: 'a1',
    authorId: 'u1',
    body: 'hola',
    status: 'visible',
    parentId: null,
    rootId: null,
    likeCount: 0,
    editedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: 'u1', name: 'Persona', avatarUrl: null },
    ...overrides,
  } as CommentWithAuthor
}

describe('toPublicComment', () => {
  it('un comentario visible expone body y autor tal cual', () => {
    const result = toPublicComment(makeComment())
    expect(result.body).toBe('hola')
    expect(result.author).toEqual({ id: 'u1', name: 'Persona', avatarUrl: null })
    expect(result.isHidden).toBe(false)
    expect(result.isDeleted).toBe(false)
  })

  it('un comentario `eliminado` blanquea body y autor, isDeleted e isHidden en true', () => {
    const result = toPublicComment(makeComment({ status: 'eliminado' }))
    expect(result.body).toBe('')
    expect(result.author).toBeNull()
    expect(result.isDeleted).toBe(true)
    expect(result.isHidden).toBe(true)
  })

  it('un comentario `oculto` también blanquea body y autor, pero isDeleted queda en false', () => {
    const result = toPublicComment(makeComment({ status: 'oculto' }))
    expect(result.body).toBe('')
    expect(result.author).toBeNull()
    expect(result.isDeleted).toBe(false)
    expect(result.isHidden).toBe(true)
  })
})
