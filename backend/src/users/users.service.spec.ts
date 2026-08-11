import { Test } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Role, type User } from '@prisma/client'
import { UsersService } from './users.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'

type MockPrisma = {
  user: { findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock; count: jest.Mock }
  $transaction: jest.Mock
}

describe('UsersService', () => {
  let service: UsersService
  let prisma: MockPrisma
  let audit: { record: jest.Mock }

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    }
    audit = { record: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile()

    service = module.get(UsersService)
  })

  it('lanza NotFoundException si el usuario objetivo no existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    const admin = { id: 'admin-1', role: Role.ADMIN } as User

    await expect(service.update('missing', {}, admin)).rejects.toThrow(NotFoundException)
  })

  it('un ADMIN no puede cambiar el rol de otro usuario', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.EDITOR, isActive: true })
    const admin = { id: 'admin-1', role: Role.ADMIN } as User

    await expect(service.update('u1', { role: Role.ADMIN }, admin)).rejects.toThrow(
      ForbiddenException
    )
  })

  it('un SUPER_ADMIN sí puede cambiar el rol de otro usuario y queda auditado', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.EDITOR, isActive: true })
    prisma.user.update.mockResolvedValue({ id: 'u1', role: Role.ADMIN })
    const superAdmin = { id: 'super-1', role: Role.SUPER_ADMIN } as User

    const result = await service.update('u1', { role: Role.ADMIN }, superAdmin)

    expect(result.role).toBe(Role.ADMIN)
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.role_change', entityId: 'u1' })
    )
  })

  it('nadie puede cambiar su propio rol', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'self-1',
      role: Role.SUPER_ADMIN,
      isActive: true,
    })
    const self = { id: 'self-1', role: Role.SUPER_ADMIN } as User

    await expect(service.update('self-1', { role: Role.ADMIN }, self)).rejects.toThrow(
      ForbiddenException
    )
  })

  it('nadie puede desactivar su propia cuenta', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'self-1',
      role: Role.SUPER_ADMIN,
      isActive: true,
    })
    const self = { id: 'self-1', role: Role.SUPER_ADMIN } as User

    await expect(service.update('self-1', { isActive: false }, self)).rejects.toThrow(
      ForbiddenException
    )
  })

  it('un ADMIN puede desactivar a otro usuario sin tocar su rol', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: Role.EDITOR, isActive: true })
    prisma.user.update.mockResolvedValue({ id: 'u1', isActive: false })
    const admin = { id: 'admin-1', role: Role.ADMIN } as User

    const result = await service.update('u1', { isActive: false }, admin)

    expect(result.isActive).toBe(false)
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.deactivate', entityId: 'u1' })
    )
  })
})
