import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string

  @ApiProperty({ minLength: 8, example: 'contraseña-nueva-123' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72) // límite práctico de bcrypt
  password!: string
}
