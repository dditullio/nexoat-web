import { Module } from '@nestjs/common'
import { GiftsController } from './gifts.controller'
import { AdminGiftsController } from './admin-gifts.controller'
import { GiftsService } from './gifts.service'
import { PdfRenderService } from './pdf-render.service'

// PrismaModule/AuditModule/MailModule son @Global() — no hace falta importarlos.
@Module({
  controllers: [GiftsController, AdminGiftsController],
  providers: [GiftsService, PdfRenderService],
})
export class GiftsModule {}
