import { Module } from '@nestjs/common'
import { CommentsController } from './comments.controller'
import { MyCommentsController } from './my-comments.controller'
import { AdminCommentsController } from './admin-comments.controller'
import { CommentsService } from './comments.service'
import { CommentLikesService } from './comment-likes.service'
import { AdminCommentsService } from './admin-comments.service'

@Module({
  controllers: [CommentsController, MyCommentsController, AdminCommentsController],
  providers: [CommentsService, CommentLikesService, AdminCommentsService],
})
export class CommentsModule {}
