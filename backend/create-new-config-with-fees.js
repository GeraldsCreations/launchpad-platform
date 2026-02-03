/**
 * Create New DBC Config with 1% Bonding Curve Fees
 * 
 * Run: node create-new-config-with-fees.js
 */

const { Connection, PublicKey, Keypair, sendAndConfirmTransaction } = require('@solana/web3.js');
const { DynamicBondingCurveClient } = require('@meteora-ag/dynamic-bonding-curve-sdk');
const { buildCurveWithMarketCap, ActivationType, MigrationOption, MigrationFeeOption } = require('@meteora-ag/dynamic-bonding-curve-sdk');
const BN = require('bn.js');
const fs = require('fs');
require('dotenv').config();

async function main() {
  console.log('🚀 Creating new DBC config with 1% bonding curve fees...\n');

  // Connect to Solana
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  
  console.log(`📡 Connected to: ${rpcUrl}`);

  // Load platform wallet
  const platformWalletKey = JSON.parse(process.env.PLATFORM_WALLET_KEYPAIR);
  const platformWallet = Keypair.fromSecretKey(Uint8Array.from(platformWalletKey));
  
  console.log(`💰 Platform wallet: ${platformWallet.publicKey.toBase58()}`);

  // Check balance
  const balance = await connection.getBalance(platformWallet.publicKey);
  console.log(`   Balance: ${balance / 1e9} SOL\n`);

  if (balance < 0.5 * 1e9) {
    console.error('❌ Insufficient balance (need at least 0.5 SOL)');
    process.exit(1);
  }

  // Initialize DBC client
  const client = new DynamicBondingCurveClient(connection, 'confirmed');

  // Build curve with NEW FEE STRUCTURE
  console.log('📈 Building bonding curve with fees:');
  console.log('   Bonding Curve: 1% (0.5% platform + 0.5% creator)');
  console.log('   After Graduation: 0.25%\n');

  const curveConfig = buildCurveWithMarketCap({
    tokenType: 0, // SPL Token
    tokenDecimal: 9,
    totalSupply: new BN(1_000_000_000),
    tokenUpdateAuthorityOption: 0, // None
    baseFeeMode: 0, // Dynamic
    baseFeeParams: {
      initialFee: {
        feePercentage: 100, // 1%
        totalDuration: 0,
      },
      finalFee: {
        feePercentage: 25, // 0.25%
        totalDuration: 86400, // 1 day
      },
    },
    
    dynamicFeeEnabled: false,
    activationType: ActivationType.Timestamp,
    
    // NEW: 1% bonding curve fees (split 50/50)
    migrationFee: {
      feePercentage: 50,          // 0.5% platform (50 bps)
      creatorFeePercentage: 50,   // 0.5% creator (50 bps)
    },
    
    // After graduation: 0.25%
    migratedPoolFee: {
      collectFeeMode: 0,
      dynamicFee: 0,
      poolFeeBps: 25, // 0.25%
    },
    
    // Liquidity split
    partnerPermanentLockedLiquidityPercentage: 5,
    partnerLiquidityPercentage: 45,
    creatorPermanentLockedLiquidityPercentage: 5,
    creatorLiquidityPercentage: 45,
    
    // Market cap curve
    initialMarketCap: 1000,
    migrationMarketCap: 10000,
    
    collectFeeMode: 0,
    creatorTradingFeePercentage: 0,
    poolCreationFee: 0.05, // 0.05 SOL
    migrationOption: MigrationOption.MET_DAMM_V2,
    migrationFeeOption: MigrationFeeOption.FixedBps25,
  });

  console.log(`✅ Curve built with ${curveConfig.curve?.length || 0} points\n`);

  // Generate new config keypair
  const configKeypair = Keypair.generate();
  
  console.log(`🔑 New config address: ${configKeypair.publicKey.toBase58()}\n`);

  // Create config transaction
  console.log('📝 Building configuration transaction...');
  
  const quoteMint = new PublicKey('So11111111111111111111111111111111111111112');
  
  const configTx = await client.partner.createConfig({
    ...curveConfig,
    config: configKeypair.publicKey,
    feeClaimer: platformWallet.publicKey,
    leftoverReceiver: platformWallet.publicKey,
    quoteMint,
    payer: platformWallet.publicKey,
  });

  // Add recent blockhash
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  configTx.recentBlockhash = blockhash;
  configTx.feePayer = platformWallet.publicKey;

  // Sign with both keypairs
  configTx.partialSign(configKeypair);
  configTx.partialSign(platformWallet);

  console.log('✅ Transaction signed\n');

  // Send transaction
  console.log('📤 Sending transaction to blockchain...');
  
  const signature = await sendAndConfirmTransaction(
    connection,
    configTx,
    [configKeypair, platformWallet],
    { commitment: 'confirmed' }
  );

  console.log(`✅ Config created on-chain!`);
  console.log(`   Signature: ${signature}`);
  console.log(`   Config: ${configKeypair.publicKey.toBase58()}\n`);

  // Update .env file
  console.log('💾 Updating .env file...');
  
  const envPath = '.env';
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace old config with new one
  const oldConfigMatch = envContent.match(/DBC_PLATFORM_CONFIG_KEY=.*/);
  if (oldConfigMatch) {
    envContent = envContent.replace(
      /DBC_PLATFORM_CONFIG_KEY=.*/,
      `DBC_PLATFORM_CONFIG_KEY=${configKeypair.publicKey.toBase58()}`
    );
  } else {
    envContent += `\nDBC_PLATFORM_CONFIG_KEY=${configKeypair.publicKey.toBase58()}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ .env updated\n');

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 NEW CONFIG CREATED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Config Address: ${configKeypair.publicKey.toBase58()}`);
  console.log(`Transaction: ${signature}`);
  console.log(`\nFee Structure:`);
  console.log(`  Bonding Curve: 1% (0.5% platform + 0.5% creator)`);
  console.log(`  After Graduation: 0.25%`);
  console.log(`\nNext Steps:`);
  console.log(`  1. Update database: UPDATE platform_config SET value='${configKeypair.publicKey.toBase58()}' WHERE key='dbc_platform_config';`);
  console.log(`  2. Restart backend: pm2 restart launchpad`);
  console.log(`  3. Verify indexer filters by new config`);
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
