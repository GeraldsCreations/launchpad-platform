import { IsString, IsNumber, IsOptional, Min, Max, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for building unsigned token creation transaction
 * Bot will sign and broadcast this transaction themselves
 */
export class BuildTransactionDto {
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

  @ApiProperty({ description: 'Liquidity amount in SOL bot will provide', example: 0.5 })
  @IsNumber()
  @Min(0.1)
  liquidityAmount: number;

  @ApiProperty({ description: 'Bot creator wallet address (will sign transaction)' })
  @IsString()
  creator: string;

  @ApiProperty({ description: 'Bot creator ID (OpenClaw agent)', required: false })
  @IsOptional()
  @IsString()
  creatorBotId?: string;
}

export class BuildTransactionResponseDto {
  @ApiProperty({ description: 'Unsigned transaction (base64 encoded)' })
  transaction: string;

  @ApiProperty({ description: 'Token mint address (will be created)' })
  tokenMint: string;

  @ApiProperty({ description: 'Instructions for bot' })
  message: string;
}

/**
 * DTO for submitting signed transaction
 */
export class SubmitTransactionDto {
  @ApiProperty({ description: 'Signed transaction (base64 encoded)' })
  @IsString()
  signedTransaction: string;

  @ApiProperty({ description: 'Token mint address' })
  @IsString()
  tokenMint: string;

  @ApiProperty({ description: 'Bot creator wallet address' })
  @IsString()
  creator: string;

  @ApiProperty({ description: 'Bot creator ID', required: false })
  @IsOptional()
  @IsString()
  creatorBotId?: string;

  @ApiProperty({ description: 'Initial price for pool creation', example: 0.000001 })
  @IsNumber()
  @Min(0.000000001)
  initialPrice: number;

  @ApiProperty({ description: 'Liquidity amount in SOL', example: 0.5 })
  @IsNumber()
  @Min(0.1)
  liquidityAmount: number;
}

export class SubmitTransactionResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ description: 'Transaction signature' })
  signature: string;

  @ApiProperty({ description: 'Token mint address' })
  tokenMint: string;

  @ApiProperty({ description: 'Pool address (if pool was created)' })
  poolAddress?: string;

  @ApiProperty({ description: 'Message' })
  message: string;

  @ApiProperty({ description: 'Next steps for bot' })
  nextSteps: string;
}

export class BuildLiquidityTransactionDto {
  @ApiProperty({ description: 'Pool address' })
  @IsString()
  poolAddress: string;

  @ApiProperty({ description: 'Token mint address' })
  @IsString()
  tokenMint: string;

  @ApiProperty({ description: 'Liquidity amount in SOL', example: 0.5 })
  @IsNumber()
  @Min(0.1)
  liquidityAmount: number;

  @ApiProperty({ description: 'Bot wallet address' })
  @IsString()
  botWallet: string;

  @ApiProperty({ description: 'Bot creator ID', required: false })
  @IsOptional()
  @IsString()
  creatorBotId?: string;
}

export class BuildLiquidityTransactionResponseDto {
  @ApiProperty({ description: 'Unsigned liquidity transaction (base64)' })
  transaction: string;

  @ApiProperty({ description: 'Position pubkey that will be created' })
  positionPubkey: string;

  @ApiProperty({ description: 'Instructions' })
  message: string;
}
