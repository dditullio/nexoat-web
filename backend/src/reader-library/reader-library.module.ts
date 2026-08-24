import { Module } from '@nestjs/common'
import { ReadingHistoryController } from './reading-history.controller'
import { ReadingHistoryService } from './reading-history.service'
import { SavedArticlesController } from './saved-articles.controller'
import { SavedArticlesService } from './saved-articles.service'

@Module({
  controllers: [ReadingHistoryController, SavedArticlesController],
  providers: [ReadingHistoryService, SavedArticlesService],
  // ArticlesModule usa ReadingHistoryService para registrar cada visita
  // (ver ArticlesService.findPublishedBySlug).
  exports: [ReadingHistoryService],
})
export class ReaderLibraryModule {}
