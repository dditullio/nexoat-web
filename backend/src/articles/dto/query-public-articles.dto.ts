import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Level } from '@prisma/client'
import { AUDIENCE_API_VALUES, type AudienceApiValue } from '../audience.util'

export class QueryPublicArticlesDto {
  @ApiPropertyOptional({ description: 'Slug de categoría' })
  @IsOptional()
  @IsString()
  category?: string

  @ApiPropertyOptional({ enum: Level })
  @IsOptional()
  @IsEnum(Level)
  level?: Level

  @ApiPropertyOptional({ enum: AUDIENCE_API_VALUES })
  @IsOptional()
  @IsIn(AUDIENCE_API_VALUES)
  audience?: AudienceApiValue

  @ApiPropertyOptional({ description: 'Búsqueda libre en título/subtítulo/extracto' })
  @IsOptional()
  @IsString()
  query?: string

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number
}
