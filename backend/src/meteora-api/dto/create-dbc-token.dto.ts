import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateDbcTokenDto {
  @ApiProperty({ example: 'My Awesome Token' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'MAT' })
  @IsString()
  symbol: string;

  @ApiProperty({ example: 'The best token ever created on LaunchPad' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'https://example.com/image.png', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 'Bot123PublicKey' })
  @IsString()
  creator: string;

  @ApiProperty({ example: 'agent-main' })
  @IsString()
  creatorBotId: string;

  @ApiProperty({ example: 0.1, description: 'Optional initial buy amount in SOL', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  firstBuyAmount?: number;
}

export class CreateDbcTokenResponseDto {
  @ApiProperty()
  transaction: string;

  @ApiProperty()
  poolAddress: string;

  @ApiProperty()
  tokenMint: string;

  @ApiProperty()
  message: string;
}

export class SubmitDbcTokenDto {
  @ApiProperty()
  @IsString()
  signedTransaction: string;

  @ApiProperty()
  @IsString()
  poolAddress: string;

  @ApiProperty()
  @IsString()
  tokenMint: string;

  @ApiProperty()
  @IsString()
  creator: string;

  @ApiProperty()
  @IsString()
  creatorBotId: string;
}

export class CreatePartnerConfigDto {
  @ApiProperty({ example: 'LaunchPad' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://launchpad.example.com' })
  @IsString()
  website: string;

  @ApiProperty({ example: 'https://launchpad.example.com/logo.png' })
  @IsString()
  logo: string;

  @ApiProperty({ example: 10, description: 'Migration threshold in SOL' })
  @IsNumber()
  @Min(1)
  @Max(100)
  migrationThreshold: number;

  @ApiProperty({ example: 0.05, description: 'Pool creation fee in SOL' })
  @IsNumber()
  @Min(0)
  @Max(1)
  poolCreationFee: number;

  @ApiProperty({ example: 100, description: 'Trading fee in basis points (100 = 1%)' })
  @IsNumber()
  @Min(1)
  @Max(1000)
  tradingFeeBps: number;

  @ApiProperty({ example: 50, description: 'Creator fee percentage (50 = 50% of trading fee)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  creatorFeeBps: number;
}
