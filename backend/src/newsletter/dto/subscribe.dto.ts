import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator'

export class SubscribeDto {
  @ApiProperty({ example: 'persona@ejemplo.com' })
  @IsEmail()
  email!: string

  @ApiPropertyOptional({ example: 'homepage-hero', description: 'De dónde vino el alta' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string
}
