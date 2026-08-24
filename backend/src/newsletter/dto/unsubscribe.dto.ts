import { ApiProperty } from '@nestjs/swagger'
import { IsEmail } from 'class-validator'

export class UnsubscribeDto {
  @ApiProperty({ example: 'persona@ejemplo.com' })
  @IsEmail()
  email!: string
}
