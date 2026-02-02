import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class BuyTokenDto {
  @ApiProperty({ description: 'Token address', example: 'TokenAddr1234567890123456789012345678' })
  @IsString()
  tokenAddress: string;

  @ApiProperty({ description: 'Amount of SOL to spend', example: 0.5 })
  @IsNumber()
  @Min(0.001)
  amountSol: number;

  @ApiProperty({ description: 'Buyer wallet address', example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' })
  @IsString()
  buyer: string;

  @ApiProperty({ description: 'Minimum tokens to receive (slippage protection)', example: 45000, required: false })
  @IsNumber()
  @Min(0)
  minTokensOut?: number;
}
