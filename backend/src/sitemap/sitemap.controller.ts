import { Controller, Get, Header } from '@nestjs/common'
import { VERSION_NEUTRAL } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { SitemapService } from './sitemap.service'

/**
 * `version: VERSION_NEUTRAL` para quedar en `/sitemap.xml` sin el prefijo
 * `/v1` que agrega el versionado global (`main.ts`) — un buscador espera
 * encontrarlo ahí. El frontend lo expone en su propio dominio proxeando
 * esta ruta desde nginx (ver `frontend/nginx.conf` y docs/features/seo.md).
 */
@ApiExcludeController()
@Controller({ path: 'sitemap.xml', version: VERSION_NEUTRAL })
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get()
  @Header('Content-Type', 'application/xml')
  async getSitemap(): Promise<string> {
    const siteUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    return this.sitemapService.buildXml(siteUrl)
  }
}
