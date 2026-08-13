import { Module } from '@nestjs/common'
import { SettingsModule } from '../settings/settings.module'
import { ArticlesService } from './articles.service'
import { ArticlesController } from './articles.controller'
import { AdminArticlesController } from './admin-articles.controller'
import { CategoriesController } from './categories.controller'
import { AdminCategoriesController } from './admin-categories.controller'

@Module({
  imports: [SettingsModule],
  controllers: [
    ArticlesController,
    AdminArticlesController,
    CategoriesController,
    AdminCategoriesController,
  ],
  providers: [ArticlesService],
})
export class ArticlesModule {}
