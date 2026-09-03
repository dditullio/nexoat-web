import { Controller, Get, Header } from '@nestjs/common'
import { VERSION_NEUTRAL } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'

/**
 * `api.nexoat.com` nunca tenía robots.txt propio — Google podía rastrear
 * cualquier endpoint de la API sin restricción (confirmado en Search
 * Console: llegó a indexar el intento de `/v1/auth/google?...` seguido
 * desde el botón de OAuth). Bloqueo total: nada acá tiene valor de
 * indexación, el contenido público vive en `nexoat.com`. Ver
 * docs/features/seo.md, sección "Long tail".
 */
@ApiExcludeController()
@Controller({ path: 'robots.txt', version: VERSION_NEUTRAL })
export class RobotsController {
  @Get()
  @Header('Content-Type', 'text/plain')
  getRobots(): string {
    return 'User-agent: *\nDisallow: /\n'
  }
}
