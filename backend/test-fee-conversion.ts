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

const baseParams = {
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
    baseFeeMode: BaseFeeMode.FeeSchedulerLinear as BaseFeeMode.FeeSchedulerLinear,
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
  migrationOption: MigrationOption.MET_DAMM_V2,
  migrationFeeOption: MigrationFeeOption.FixedBps25,
};

async function testFee(input: number) {
  const curve = buildCurveWithMarketCap({
    ...baseParams,
    poolCreationFee: input,
  });
  
  const output = curve.poolCreationFee.toString();
  const ratio = parseInt(output) / input;
  
  console.log(`Input: ${input.toLocaleString()} → Output: ${parseInt(output).toLocaleString()} (${ratio}x)`);
}

async function main() {
  console.log('🧪 Testing poolCreationFee conversion factor\n');
  
  await testFee(0);
  await testFee(1);
  await testFee(10);
  await testFee(100);
  await testFee(1000);
  await testFee(10000);
  await testFee(100000);
  await testFee(1000000); // Min valid: 1M lamports
  await testFee(50); // 0.05 SOL if input is in SOL (not lamports)
  await testFee(50000000); // 0.05 SOL in lamports
  
  console.log('\n💡 Hypothesis: SDK expects input in SOL (not lamports), then converts to lamports internally');
  console.log('If true: poolCreationFee should be 0.05 for 0.05 SOL, NOT 50000000');
}

main().catch(console.error);
