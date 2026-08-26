import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsOptional, Matches } from 'class-validator'

export class RequestSignupDto {
  @ApiProperty({ example: 'persona@ejemplo.com' })
  @IsEmail()
  email!: string

  // A dónde volver una vez activada la cuenta (ver docs/features/article-comments.md,
  // decisión 4 — ej. un artículo donde estaba comentando). Ruta relativa
  // propia del sitio, nunca una URL absoluta: `^/(?!/)` exige que empiece
  // con una sola barra, no dos (`//evil.com` es protocol-relative y saldría
  // del sitio) ni un esquema (`http:`, `javascript:`, etc.).
  @ApiPropertyOptional({ example: '/articulo/algun-slug' })
  @IsOptional()
  @Matches(/^\/(?!\/).*/, { message: 'redirect debe ser una ruta relativa del sitio' })
  redirect?: string
}
