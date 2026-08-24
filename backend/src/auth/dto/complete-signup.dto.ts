import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class CompleteSignupDto {
  @ApiProperty()
  @IsString()
  token!: string

  @ApiProperty({ example: 'María Pérez' })
  @IsString()
  @MaxLength(120)
  name!: string

  @ApiProperty({ minLength: 8, example: 'contraseña-segura-123' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72) // límite práctico de bcrypt
  password!: string

  // La igualdad con `password` se valida en AuthService.completeSignup (no
  // acá) — class-validator no trae de fábrica un decorator para comparar
  // dos campos entre sí sin escribir una constraint custom aparte.
  @ApiProperty({ minLength: 8 })
  @IsString()
  passwordConfirm!: string
}
