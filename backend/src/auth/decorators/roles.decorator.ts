import { SetMetadata } from '@nestjs/common'
import type { Role } from '@prisma/client'

export const ROLES_KEY = 'roles'

/**
 * Lista explícita de roles permitidos (no jerárquica): cada controller
 * declara exactamente qué roles pueden entrar, siguiendo la matriz de
 * permisos de docs/features/auth-and-admin-dashboard.md. Se combina con
 * `RolesGuard` + `JwtAuthGuard`.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
