import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role, type User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { SettingsService } from './settings.service'
import { UpdateSiteSettingsDto } from './dto/update-settings.dto'

// Solo ADMIN+ (no EDITOR): esto no es edición de contenido, es configuración
// de todo el sitio público — misma franja que usuarios/auditoría.
@ApiTags('admin/settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Configuración global del sitio' })
  get() {
    return this.settingsService.getSiteSettings()
  }

  @Patch()
  @ApiOperation({
    summary: 'Actualiza qué niveles de suscripción se muestran en el sitio público',
  })
  update(@Body() dto: UpdateSiteSettingsDto, @CurrentUser() actor: User) {
    return this.settingsService.updateVisibleScopes(dto.visibleArticleScopes, actor)
  }
}
