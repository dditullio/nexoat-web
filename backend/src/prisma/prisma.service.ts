import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Injectable, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

/**
 * Wrapper de PrismaClient como provider de Nest: conecta al iniciar el
 * módulo y desconecta prolijamente al apagar la app, en vez de dejar que
 * cada consumidor maneje su propio ciclo de vida de conexión.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  async onModuleInit() {
    await this.$connect()
    this.logger.log('Conectado a la base de datos')
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
