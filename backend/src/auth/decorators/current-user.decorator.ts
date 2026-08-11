import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { User } from '@prisma/client'

/** Usuario autenticado que dejó `JwtAuthGuard`/`LocalAuthGuard` en `req.user`. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest()
  return request.user
})
