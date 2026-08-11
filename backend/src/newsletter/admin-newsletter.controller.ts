import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { NewsletterService } from './newsletter.service'
import { QuerySubscribersDto } from './dto/query-subscribers.dto'

@ApiTags('admin/newsletter')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/newsletter/subscribers')
export class AdminNewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Get()
  @ApiOperation({ summary: 'Listado de suscriptores al newsletter' })
  findAll(@Query() query: QuerySubscribersDto) {
    return this.newsletterService.findAll(query)
  }
}
