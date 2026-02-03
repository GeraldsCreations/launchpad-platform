#!/usr/bin/env ts-node
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

async function main() {
  console.log('🧪 Testing poolCreationFee behavior\n');

  // Test 1: poolCreationFee = 0 (free)
  console.log('TEST 1: buildCurveWithMarketCap WITH poolCreationFee = 0');
  console.log('========================================');
  
  const curve1 = buildCurveWithMarketCap({
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
    poolCreationFee: 0, // Free pool creation
    migrationOption: MigrationOption.MET_DAMM_V2,
    migrationFeeOption: MigrationFeeOption.FixedBps25,
  });
  
  console.log('poolCreationFee:', curve1.poolCreationFee);
  console.log('poolCreationFee type:', typeof curve1.poolCreationFee);
  console.log('poolCreationFee toString:', curve1.poolCreationFee?.toString?.());
  console.log('');

  // Test 2: poolCreationFee = 50000000 (0.05 SOL)
  console.log('TEST 2: buildCurveWithMarketCap WITH poolCreationFee = 50000000 (0.05 SOL)');
  console.log('========================================');
  
  const curve2 = buildCurveWithMarketCap({
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
    poolCreationFee: 50000000, // 0.05 SOL in lamports
    migrationOption: MigrationOption.MET_DAMM_V2,
    migrationFeeOption: MigrationFeeOption.FixedBps25,
  });
  
  console.log('poolCreationFee:', curve2.poolCreationFee);
  console.log('poolCreationFee type:', typeof curve2.poolCreationFee);
  console.log('poolCreationFee toString:', curve2.poolCreationFee?.toString?.());
  console.log('');
}

main().catch(console.error);
