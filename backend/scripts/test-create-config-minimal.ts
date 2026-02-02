#!/usr/bin/env ts-node
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  buildCurveWithMarketCap,
  TokenType,
  TokenDecimal,
  TokenUpdateAuthorityOption,
  MigrationOption,
  MigrationFeeOption,
  ActivationType,
  BaseFeeMode,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  console.log('🧪 Minimal Config Test\n');

  const curveConfig = buildCurveWithMarketCap({
    totalTokenSupply: 1_000_000_000,
    tokenType: TokenType.SPL,
    tokenBaseDecimal: TokenDecimal.NINE,
    tokenQuoteDecimal: TokenDecimal.NINE,
    tokenUpdateAuthority: TokenUpdateAuthorityOption.CreatorUpdateAuthority,
    lockedVestingParams: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    leftover: 0,
    baseFeeParams: {
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      feeSchedulerParam: {
        startingFeeBps: 100,
        endingFeeBps: 25,
        numberOfPeriod: 10,
        totalDuration: 86400,
      },
    },
    dynamicFeeEnabled: false,
    activationType: ActivationType.Timestamp,
    migrationFee: {
      feePercentage: 0,
      creatorFeePercentage: 0,
    },
    migratedPoolFee: {
      collectFeeMode: 0,
      dynamicFee: 0,
      poolFeeBps: 25,
    },
    partnerPermanentLockedLiquidityPercentage: 0,
    partnerLiquidityPercentage: 50,
    creatorPermanentLockedLiquidityPercentage: 0,
    creatorLiquidityPercentage: 50,
    initialMarketCap: 1000,
    migrationMarketCap: 10000,
    collectFeeMode: 0,
    creatorTradingFeePercentage: 50,
    poolCreationFee: 50000000,
    migrationOption: MigrationOption.MET_DAMM_V2,
    migrationFeeOption: MigrationFeeOption.FixedBps25,
  });

  console.log('✅ Curve built successfully!');
  console.log('');
  console.log('Curve config keys:', Object.keys(curveConfig).join(', '));
  console.log('');
  console.log('Has poolFees?', !!curveConfig.poolFees);
  console.log('');
  
  if (curveConfig.poolFees) {
    console.log('Pool fees:', JSON.stringify(curveConfig.poolFees, null, 2));
  } else {
    console.log('❌ ERROR: poolFees is missing!');
  }
  
  console.log('');
  console.log('Curve points:', curveConfig.curve?.length || 0);
}

main().catch(console.error);
