import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

/**
 * Global: ningún otro módulo necesita importar PrismaModule explícitamente
 * para inyectar PrismaService, es la base de acceso a datos de toda la app.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
