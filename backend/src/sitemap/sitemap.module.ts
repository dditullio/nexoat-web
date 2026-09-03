import { Module } from '@nestjs/common'
import { SitemapController } from './sitemap.controller'
import { SitemapService } from './sitemap.service'
import { RobotsController } from './robots.controller'

@Module({
  controllers: [SitemapController, RobotsController],
  providers: [SitemapService],
})
export class SitemapModule {}
