import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsOptional } from 'class-validator'
import { Role } from '@prisma/client'

export class UpdateUserDto {
  /** Cambiar esto exige rol SUPER_ADMIN — ver UsersService.update(). */
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
