import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateBackupDto {
  @ApiPropertyOptional({
    description: 'Nota libre sobre por qué se hace este respaldo — queda en el metadata del zip',
    example: 'antes de importar los artículos de agosto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string
}
