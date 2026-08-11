import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Role, type User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UsersService } from './users.service'
import { QueryUsersDto } from './dto/query-users.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@ApiTags('admin/users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listado de usuarios, paginado y filtrable' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query)
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Cambia rol y/o estado activo de un usuario',
    description: 'Cambiar el rol exige específicamente SUPER_ADMIN (verificado en el service).',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: User,
    @Req() req: FastifyRequest
  ) {
    return this.usersService.update(id, dto, actor, req.ip)
  }
}
