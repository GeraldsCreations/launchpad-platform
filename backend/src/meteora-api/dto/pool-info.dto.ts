import { ApiProperty } from '@nestjs/swagger';

export class PoolInfoDto {
  @ApiProperty()
  poolAddress: string;

  @ApiProperty()
  tokenAddress: string;

  @ApiProperty()
  tokenName: string;

  @ApiProperty()
  tokenSymbol: string;

  @ApiProperty()
  baseTokenAddress: string;

  @ApiProperty()
  currentPrice: number;

  @ApiProperty()
  liquidity: number;

  @ApiProperty()
  tvl: number;

  @ApiProperty()
  volume24h: number;

  @ApiProperty()
  feeRate: number;

  @ApiProperty()
  binStep: number;

  @ApiProperty()
  activeId: number;

  @ApiProperty()
  creator: string;

  @ApiProperty()
  createdAt: Date;
}

export class TokenInfoDto {
  @ApiProperty()
  address: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  poolAddress: string;

  @ApiProperty()
  currentPrice: number;

  @ApiProperty()
  volume24h: number;

  @ApiProperty()
  liquidity: number;

  @ApiProperty()
  priceChange24h: number;

  @ApiProperty()
  createdAt: Date;
}

export class TrendingTokenDto {
  @ApiProperty({ type: [TokenInfoDto] })
  tokens: TokenInfoDto[];

  @ApiProperty()
  total: number;
}
