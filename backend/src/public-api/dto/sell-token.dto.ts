import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class SellTokenDto {
  @ApiProperty({ description: 'Token address', example: 'TokenAddr1234567890123456789012345678' })
  @IsString()
  tokenAddress: string;

  @ApiProperty({ description: 'Amount of tokens to sell', example: 50000 })
  @IsNumber()
  @Min(1)
  amountTokens: number;

  @ApiProperty({ description: 'Seller wallet address', example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' })
  @IsString()
  seller: string;

  @ApiProperty({ description: 'Minimum SOL to receive (slippage protection)', example: 0.45, required: false })
  @IsNumber()
  @Min(0)
  minSolOut?: number;
}
