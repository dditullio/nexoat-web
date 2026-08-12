import { Module } from '@nestjs/common'
import { BackupController } from './backup.controller'
import { BackupService } from './backup.service'

// PrismaModule y AuditModule son @Global() — no hace falta importarlos.
@Module({
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
