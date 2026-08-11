import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { AuditService } from './audit.service'
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto'

@ApiTags('admin/audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Listado de auditoría, filtrable por actor/tipo de entidad/rango de fecha',
  })
  findAll(@Query() query: QueryAuditLogsDto) {
    return this.auditService.findAll(query)
  }
}
