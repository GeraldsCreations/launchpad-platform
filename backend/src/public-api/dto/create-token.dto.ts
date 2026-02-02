import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, MinLength, MaxLength, Min } from 'class-validator';

export class CreateTokenDto {
  @ApiProperty({ description: 'Token name', example: 'Gereld Bot' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Token symbol', example: 'GERELD' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  symbol: string;

  @ApiProperty({ description: 'Token description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Image URL', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'Creator wallet address', example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' })
  @IsString()
  @MinLength(32)
  @MaxLength(44)
  creator: string;

  @ApiProperty({ description: 'Creator type', example: 'human', enum: ['human', 'clawdbot', 'agent'] })
  @IsString()
  @IsOptional()
  creatorType?: string;

  @ApiProperty({ description: 'Initial buy amount in SOL', example: 0.1, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  initialBuy?: number;
}
