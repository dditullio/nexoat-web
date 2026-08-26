import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { CommentStatus } from '@prisma/client'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'

export class QueryAdminCommentsDto {
  @ApiPropertyOptional({ enum: CommentStatus })
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus

  @ApiPropertyOptional({ description: 'Solo comentarios con al menos un reporte' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  reported?: boolean

  @ApiPropertyOptional({ description: 'Búsqueda de texto libre en el cuerpo del comentario' })
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  articleId?: string

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number
}
