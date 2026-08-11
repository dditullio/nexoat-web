import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDate, IsInt, IsOptional, IsString, Min } from 'class-validator'

export class QueryAuditLogsDto {
  @ApiPropertyOptional({ description: 'Filtra por id del usuario que hizo la acción' })
  @IsOptional()
  @IsString()
  actorId?: string

  @ApiPropertyOptional({ description: 'Filtra por tipo de entidad afectada, ej. "Article"' })
  @IsOptional()
  @IsString()
  entityType?: string

  @ApiPropertyOptional({ description: 'ISO date — desde' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date

  @ApiPropertyOptional({ description: 'ISO date — hasta' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number
}
