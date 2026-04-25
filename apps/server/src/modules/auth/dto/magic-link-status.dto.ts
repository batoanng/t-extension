import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class MagicLinkStatusDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  requestId!: string;
}
