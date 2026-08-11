import { Module } from '@nestjs/common'
import { ArticlesService } from './articles.service'
import { ArticlesController } from './articles.controller'
import { AdminArticlesController } from './admin-articles.controller'
import { CategoriesController } from './categories.controller'

@Module({
  controllers: [ArticlesController, AdminArticlesController, CategoriesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
