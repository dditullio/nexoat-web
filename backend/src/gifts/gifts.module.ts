import { Module } from '@nestjs/common'
import { GiftsController } from './gifts.controller'
import { AdminGiftsController } from './admin-gifts.controller'
import { GiftsService } from './gifts.service'

// PrismaModule/AuditModule/MailModule son @Global() — no hace falta importarlos.
@Module({
  controllers: [GiftsController, AdminGiftsController],
  providers: [GiftsService],
})
export class GiftsModule {}
