import { Module } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { AdminSettingsController } from './admin-settings.controller'

// AuditModule es @Global(), AuditService se inyecta sin importarlo acá.
@Module({
  controllers: [AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
