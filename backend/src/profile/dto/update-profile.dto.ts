import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { ProfileRole } from '@prisma/client'

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'María Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string

  /** Enviar `null` para volver a "sin elegir". */
  @ApiPropertyOptional({ enum: ProfileRole, nullable: true })
  @IsOptional()
  @IsEnum(ProfileRole)
  profileRole?: ProfileRole | null
}
