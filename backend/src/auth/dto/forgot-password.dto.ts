import { ApiProperty } from '@nestjs/swagger'
import { IsEmail } from 'class-validator'

export class ForgotPasswordDto {
  @ApiProperty({ example: 'persona@ejemplo.com' })
  @IsEmail()
  email!: string
}
