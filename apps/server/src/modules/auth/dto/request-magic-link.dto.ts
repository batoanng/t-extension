import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestMagicLinkDto {
  @ApiProperty({ example: 'demo@example.com' })
  @IsEmail()
  email!: string;
}
