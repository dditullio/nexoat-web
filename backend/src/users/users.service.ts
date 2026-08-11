import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Role, type Prisma, type User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { QueryUsersDto } from './dto/query-users.dto'
import type { UpdateUserDto } from './dto/update-user.dto'

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async findAll(filters: QueryUsersDto) {
    const page = filters.page && filters.page > 0 ? filters.page : 1
    const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25

    const where: Prisma.UserWhereInput = {
      role: filters.role,
      ...(filters.search
        ? {
            OR: [
              { email: { contains: filters.search, mode: 'insensitive' } },
              { name: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: PUBLIC_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ])

    return { items, total, page, pageSize }
  }

  async update(id: string, dto: UpdateUserDto, actor: User, ip?: string) {
    const target = await this.prisma.user.findUnique({ where: { id } })
    if (!target) throw new NotFoundException('Usuario no encontrado')

    const changesRole = dto.role !== undefined && dto.role !== target.role
    const changesStatus = dto.isActive !== undefined && dto.isActive !== target.isActive

    // El cambio de ROL se restringe específicamente a SUPER_ADMIN (no ADMIN)
    // para que un ADMIN comprometido no pueda autopromoverse ni promover a
    // un cómplice — ver docs/features/auth-and-admin-dashboard.md.
    if (changesRole && actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Solo SUPER_ADMIN puede cambiar el rol de un usuario')
    }
    // Salvaguarda contra lockout accidental: nadie se saca su propio rol o
    // se desactiva a sí mismo desde el panel.
    if (target.id === actor.id && (changesRole || dto.isActive === false)) {
      throw new ForbiddenException('No podés modificar tu propio rol o desactivar tu propia cuenta')
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role, isActive: dto.isActive },
      select: PUBLIC_USER_SELECT,
    })

    if (changesRole) {
      await this.audit.record({
        actorId: actor.id,
        action: 'user.role_change',
        entityType: 'User',
        entityId: id,
        metadata: { from: target.role, to: dto.role },
        ip,
      })
    }
    if (changesStatus) {
      await this.audit.record({
        actorId: actor.id,
        action: dto.isActive ? 'user.activate' : 'user.deactivate',
        entityType: 'User',
        entityId: id,
        ip,
      })
    }

    return updated
  }
}
