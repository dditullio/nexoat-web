import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length } from 'class-validator'

export class UpdateCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 3000 })
  @IsString()
  @Length(1, 3000)
  body!: string
}
