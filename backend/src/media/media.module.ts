import { Module } from '@nestjs/common'
import { MediaController } from './media.controller'
import { MediaService } from './media.service'

@Module({
  controllers: [MediaController],
  providers: [MediaService],
  // ProfileModule lo reusa para subir/borrar el avatar del lector — mismo
  // servicio, endpoint propio (ver profile/profile.controller.ts).
  exports: [MediaService],
})
export class MediaModule {}
