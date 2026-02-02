import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BuyTokenDto {
  @ApiProperty({ description: 'Pool address' })
  @IsString()
  poolAddress: string;

  @ApiProperty({ description: 'Amount of SOL to spend', example: 0.1 })
  @IsNumber()
  @Min(0.001)
  solAmount: number;

  @ApiProperty({ description: 'Buyer wallet address' })
  @IsString()
  wallet: string;

  @ApiProperty({ description: 'Slippage tolerance (0.01 = 1%)', example: 0.05, default: 0.05 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  slippage?: number;
}

export class SellTokenDto {
  @ApiProperty({ description: 'Pool address' })
  @IsString()
  poolAddress: string;

  @ApiProperty({ description: 'Amount of tokens to sell', example: 1000 })
  @IsNumber()
  @Min(0.000001)
  tokenAmount: number;

  @ApiProperty({ description: 'Seller wallet address' })
  @IsString()
  wallet: string;

  @ApiProperty({ description: 'Slippage tolerance (0.01 = 1%)', example: 0.05, default: 0.05 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  slippage?: number;
}

export class TradeResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  signature: string;

  @ApiProperty()
  tokenAmount: number;

  @ApiProperty()
  solAmount: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  platformFee: number;

  @ApiProperty()
  message: string;
}
