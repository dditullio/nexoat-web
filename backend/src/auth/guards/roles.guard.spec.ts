import type { ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { Role, type User } from '@prisma/client'
import { RolesGuard } from './roles.guard'

function makeContext(user: Partial<User> | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext
}

function makeReflector(requiredRoles: Role[] | undefined): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(requiredRoles) } as unknown as Reflector
}

describe('RolesGuard', () => {
  it('permite el acceso si el handler no declaró @Roles(...)', () => {
    const guard = new RolesGuard(makeReflector(undefined))
    expect(guard.canActivate(makeContext({ role: Role.USER }))).toBe(true)
  })

  it('permite el acceso si el rol del usuario está en la lista requerida', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMIN, Role.SUPER_ADMIN]))
    expect(guard.canActivate(makeContext({ role: Role.ADMIN }))).toBe(true)
  })

  it('rechaza si el rol del usuario no está en la lista requerida', () => {
    const guard = new RolesGuard(makeReflector([Role.SUPER_ADMIN]))
    expect(guard.canActivate(makeContext({ role: Role.ADMIN }))).toBe(false)
  })

  it('rechaza si no hay usuario autenticado en el request', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMIN]))
    expect(guard.canActivate(makeContext(undefined))).toBe(false)
  })
})
