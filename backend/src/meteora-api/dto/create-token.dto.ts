import { IsString, IsNumber, IsOptional, Min, Max, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTokenDto {
  @ApiProperty({ description: 'Token name', example: 'My Token' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Token symbol', example: 'MTK' })
  @IsString()
  symbol: string;

  @ApiProperty({ description: 'Token description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Token image URL', required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ description: 'Initial price in SOL', example: 0.000001 })
  @IsNumber()
  @Min(0.000000001)
  initialPrice: number;

  @ApiProperty({ description: 'Initial liquidity in SOL', example: 5 })
  @IsNumber()
  @Min(1)
  initialLiquidity: number;

  @ApiProperty({ description: 'Bin step (volatility)', example: 25, default: 25 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  binStep?: number;

  @ApiProperty({ description: 'Fee rate in basis points (0.01% = 1bp)', example: 25, default: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  feeBps?: number;

  @ApiProperty({ description: 'Creator wallet address' })
  @IsString()
  creator: string;
}

export class CreateTokenResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  poolAddress: string;

  @ApiProperty()
  tokenAddress: string;

  @ApiProperty()
  signature: string;

  @ApiProperty()
  launchFee: number; // 1 SOL

  @ApiProperty()
  message: string;
}
