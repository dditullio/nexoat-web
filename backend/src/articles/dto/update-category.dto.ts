import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

/**
 * Solo la imagen es editable por ahora — las 10 categorías son un set fijo
 * (sembrado por seed.ts, sin CRUD de alta/baja todavía). Un string vacío
 * limpia la imagen; `undefined` (campo omitido) no la toca.
 */
export class UpdateCategoryDto {
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
