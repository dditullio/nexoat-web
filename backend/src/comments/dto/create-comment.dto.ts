import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, Length } from 'class-validator'

export class CreateCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 3000 })
  @IsString()
  @Length(1, 3000)
  body!: string

  @ApiPropertyOptional({
    description: 'Id del comentario al que se responde (a cualquier profundidad del hilo)',
  })
  @IsOptional()
  @IsString()
  parentId?: string
}
