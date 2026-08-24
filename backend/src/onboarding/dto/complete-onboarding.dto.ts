import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum } from 'class-validator'
import { ProfileRole } from '@prisma/client'

export class CompleteOnboardingDto {
  @ApiProperty({ enum: ProfileRole })
  @IsEnum(ProfileRole)
  profileRole!: ProfileRole

  // Debe llegar en `true` — el service rechaza cualquier otro valor. No es
  // opcional: no hay forma de terminar el onboarding sin aceptar.
  @ApiProperty()
  @IsBoolean()
  acceptedTerms!: boolean

  // Sin marcar por defecto en la UI — opt-in real, ver
  // docs/features/email-first-signup-and-onboarding.md, decisión 7.
  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  subscribeNewsletter!: boolean
}
