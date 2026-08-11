import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: 'persona@ejemplo.com' })
  @IsEmail()
  email!: string

  @ApiProperty()
  @IsString()
  password!: string
}
