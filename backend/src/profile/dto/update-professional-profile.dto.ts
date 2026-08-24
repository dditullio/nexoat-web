import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class UpdateProfessionalProfileDto {
  @ApiProperty({ example: 'Acompañamiento en primera infancia con TEA' })
  @IsString()
  @MaxLength(160)
  specialization!: string

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  experienceYears?: number

  @ApiPropertyOptional({ description: 'Formación, trayectoria, enfoque de trabajo.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string

  // Reservado para el futuro directorio de acompañantes — sin efecto hoy,
  // ver docs/features/reader-profile.md.
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean
}
