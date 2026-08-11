import { Global, Module } from '@nestjs/common'
import { AuditService } from './audit.service'
import { AuditController } from './audit.controller'

// Global: users/articles lo inyectan sin importar AuditModule explícitamente.
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
