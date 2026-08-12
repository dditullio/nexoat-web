import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { ArticleStatus, Level } from '@prisma/client'
import { AUDIENCE_API_VALUES, type AudienceApiValue } from '../audience.util'

export class ArticleSourceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string

  @ApiProperty()
  @IsUrl({ require_protocol: true })
  url!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string
}

export class CreateArticleDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  title!: string

  @ApiPropertyOptional({ description: 'Si se omite, se deriva del título' })
  @IsOptional()
  @IsString()
  slug?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerpt?: string

  @ApiProperty({ description: 'Markdown plano' })
  @IsString()
  @MinLength(1)
  content!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string

  @ApiPropertyOptional({
    description: 'ID de Cloudinary de coverImage, para poder borrarla después',
  })
  @IsOptional()
  @IsString()
  coverImagePublicId?: string

  @ApiProperty({ enum: Level })
  @IsEnum(Level)
  level!: Level

  @ApiProperty({ enum: AUDIENCE_API_VALUES, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(AUDIENCE_API_VALUES, { each: true })
  audience!: AudienceApiValue[]

  @ApiPropertyOptional({ enum: ArticleStatus, default: ArticleStatus.borrador })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus

  @ApiProperty({
    type: [String],
    description: 'Slugs de categorías existentes (ver GET /categories)',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  categorySlugs!: string[]

  @ApiPropertyOptional({
    type: [String],
    description: 'Nombres libres — se hace findOrCreate por slug del nombre',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @ApiPropertyOptional({ description: 'Minutos estimados de lectura' })
  @IsOptional()
  @IsInt()
  @Min(1)
  readingTime?: number

  @ApiPropertyOptional({
    description:
      'Fecha de publicación (ej. la "fecha" del .md importado). Si se omite y el status pasa ' +
      'a "publicado", se usa la fecha/hora actual.',
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: string

  @ApiPropertyOptional({
    type: [ArticleSourceDto],
    description: 'Fuentes en las que se basa el artículo',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleSourceDto)
  sources?: ArticleSourceDto[]

  @ApiPropertyOptional({
    description: 'Metadata cruda del .md de origen (fecha, estado, temas, etc.), sin transformar',
  })
  @IsOptional()
  @IsObject()
  importMetadata?: Record<string, unknown>
}
