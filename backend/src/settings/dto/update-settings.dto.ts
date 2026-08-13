import { ApiProperty } from '@nestjs/swagger'
import { ArticleScope } from '@prisma/client'
import { IsArray, IsEnum } from 'class-validator'
import { TOGGLEABLE_SCOPES } from '../settings.service'

export class UpdateSiteSettingsDto {
  @ApiProperty({
    enum: TOGGLEABLE_SCOPES,
    isArray: true,
    description:
      'Niveles de suscripción visibles en el sitio público, además de "publico" (siempre visible, no se incluye acá).',
    example: [ArticleScope.suscriptores_nivel_1],
  })
  @IsArray()
  @IsEnum(ArticleScope, { each: true })
  visibleArticleScopes!: ArticleScope[]
}
