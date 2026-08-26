import { ApiProperty } from '@nestjs/swagger'
import { CommentStatus } from '@prisma/client'
import { IsIn } from 'class-validator'

/** Solo estos dos: `eliminado` pasa por DELETE /admin/comments/:id, no por acá. */
const MODERABLE_STATUSES = [CommentStatus.visible, CommentStatus.oculto] as const

export class ModerateCommentDto {
  @ApiProperty({ enum: MODERABLE_STATUSES })
  @IsIn(MODERABLE_STATUSES)
  status!: (typeof MODERABLE_STATUSES)[number]
}
