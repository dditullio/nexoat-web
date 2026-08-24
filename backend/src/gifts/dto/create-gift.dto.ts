import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * Los 4 campos "de tarjeta" (título/subtítulo/temática/resumen) son
 * obligatorios para poder crear el título — es lo que el usuario lee para
 * decidir, no tiene sentido dejarlos a medio cargar. La tapa y el PDF se
 * suben aparte (ver GiftsAdminController) — un ebook puede existir sin
 * ninguno de los dos todavía.
 */
export class CreateGiftDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  title!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  topic!: string

  @ApiProperty()
  @IsString()
  @MaxLength(600)
  summary!: string

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean

  // Se completan aparte, después de subir la imagen contra
  // `/admin/media?folder=ebook-covers` — ver GiftsService.update().
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
}
