import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import {
  DynamicBondingCurveClient,
  PoolService,
  PartnerService,
  CreatorService,
  buildCurveWithMarketCap,
  TokenType,
  TokenDecimal,
  TokenUpdateAuthorityOption,
  MigrationOption,
  MigrationFeeOption,
  ActivationType,
  BaseFeeMode,
  deriveDbcPoolAddress,
  createDbcProgram,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import * as BN from 'bn.js';

/**
 * DBC (Dynamic Bonding Curve) Service
 * Handles Meteora DBC integration for pump.fun style token launches
 */
@Injectable()
export class DbcService {
  private readonly logger = new Logger(DbcService.name);
  private connection: Connection;
  private client: DynamicBondingCurveClient;
  private poolService: PoolService;
  private partnerService: PartnerService;
  private creatorService: CreatorService;

  // Platform config (will be created once)
  private platformConfigKey: PublicKey | null = null;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get('SOLANA_RPC_URL');
    this.connection = new Connection(rpcUrl, 'confirmed');

    this.logger.log(`Initializing DBC Service with RPC: ${rpcUrl}`);

    // Initialize DBC client
    this.client = new DynamicBondingCurveClient(this.connection, 'confirmed');
    
    // Initialize services (they take connection + commitment, not client)
    this.poolService = new PoolService(this.connection, 'confirmed');
    this.partnerService = new PartnerService(this.connection, 'confirmed');
    this.creatorService = new CreatorService(this.connection, 'confirmed');

    this.logger.log('✅ DBC Service initialized');
  }

  /**
   * Get connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get platform wallet keypair from environment
   */
  private getPlatformWalletKeypair(): Keypair {
    const platformWalletKey = this.configService.get('PLATFORM_WALLET_KEYPAIR');
    if (!platformWalletKey) {
      throw new Error('PLATFORM_WALLET_KEYPAIR not configured');
    }

    const keypairArray = JSON.parse(platformWalletKey);
    return Keypair.fromSecretKey(new Uint8Array(keypairArray));
  }

  /**
   * Create partner config (one-time setup for LaunchPad)
   * This defines the bonding curve parameters for all tokens launched on LaunchPad
   */
  async createPartnerConfig(params: {
    name: string;
    website: string;
    logo: string;
    migrationThreshold: number; // In SOL (e.g., 10)
    poolCreationFee: number; // In SOL (e.g., 0.05) - SDK will convert to lamports
    tradingFeeBps: number; // In basis points (e.g., 100 = 1%)
    creatorFeeBps: number; // Percentage of trading fee to creator (e.g., 50 = 50%)
  }): Promise<{
    configKey: PublicKey;
    transaction: Transaction;
  }> {
    try {
      this.logger.log('Creating partner config...');
      this.logger.log(`Name: ${params.name}`);
      this.logger.log(`Migration Threshold: ${params.migrationThreshold} SOL`);
      this.logger.log(`Trading Fee: ${params.tradingFeeBps} bps`);

      const platformWallet = this.getPlatformWalletKeypair();

      // Build the bonding curve using market cap method (simpler than manual buildCurve)
      const curveConfig = buildCurveWithMarketCap({
        // Base token params
        totalTokenSupply: 1_000_000_000, // 1B tokens
        tokenType: TokenType.SPL,
        tokenBaseDecimal: TokenDecimal.NINE,
        tokenQuoteDecimal: TokenDecimal.NINE,
        tokenUpdateAuthority: TokenUpdateAuthorityOption.CreatorUpdateAuthority,
        
        // No locked vesting
        lockedVestingParams: {
          totalLockedVestingAmount: 0,
          numberOfVestingPeriod: 0,
          cliffUnlockAmount: 0,
          totalVestingDuration: 0,
          cliffDurationFromMigrationTime: 0,
        },
        
        leftover: 0,
        
        // Fee configuration
        baseFeeParams: {
          baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
          feeSchedulerParam: {
            startingFeeBps: params.tradingFeeBps, // Start at trading fee
            endingFeeBps: 25, // End at 0.25%
            numberOfPeriod: 10,
            totalDuration: 86400, // 1 day
          },
        },
        
        dynamicFeeEnabled: false,
        activationType: ActivationType.Timestamp,
        
        // Migration fee (no fee for migration itself)
        migrationFee: {
          feePercentage: 0,
          creatorFeePercentage: 0,
        },
        
        // Migrated pool fee (after migration to DLMM)
        migratedPoolFee: {
          collectFeeMode: 0, // QuoteToken
          dynamicFee: 0, // Disabled
          poolFeeBps: 25, // 0.25% pool fee
        },
        
        // Liquidity distribution after migration
        // SDK requires min 10% locked. We lock 10% permanently, split remaining 90% (45/45)
        partnerPermanentLockedLiquidityPercentage: 5, // 5% locked forever
        partnerLiquidityPercentage: 45, // 45% tradeable
        creatorPermanentLockedLiquidityPercentage: 5, // 5% locked forever
        creatorLiquidityPercentage: 45, // 45% tradeable
        // Total: 10% locked, 90% tradeable (45% partner, 45% creator)
        
        // Market cap curve (pump.fun style)
        initialMarketCap: 1000, // $1k market cap at start
        migrationMarketCap: 10000, // $10k at migration (10 SOL threshold)
        
        // Additional config
        collectFeeMode: 0, // CollectFeeMode.QuoteToken
        creatorTradingFeePercentage: params.creatorFeeBps,
        poolCreationFee: params.poolCreationFee, // SDK expects SOL, converts to lamports internally (multiplies by 1e9)
        migrationOption: MigrationOption.MET_DAMM_V2,
        migrationFeeOption: MigrationFeeOption.FixedBps25, // 0.25% after migration
      });

      this.logger.log(`✅ Bonding curve built with ${curveConfig.curve?.length || 0} points`);
      this.logger.log(`poolCreationFee INPUT: ${params.poolCreationFee}`);
      this.logger.log(`poolCreationFee OUTPUT TYPE: ${typeof curveConfig.poolCreationFee}`);
      this.logger.log(`poolCreationFee OUTPUT VALUE: ${curveConfig.poolCreationFee}`);
      this.logger.log(`poolCreationFee IS BN: ${curveConfig.poolCreationFee instanceof BN}`);
      this.logger.log(`poolCreationFee toString: ${curveConfig.poolCreationFee?.toString?.()}`);
      this.logger.log(`Has poolFees? ${!!curveConfig.poolFees}`);
      if (curveConfig.poolFees) {
        this.logger.log(`poolFees.baseFee:`, JSON.stringify(curveConfig.poolFees.baseFee));
      }

      // Generate config keypair
      const configKeypair = Keypair.generate();

      // Create config transaction using DBC client directly
      // Create a simple wallet adapter for the keypair
      const wallet = {
        publicKey: platformWallet.publicKey,
        signTransaction: async (tx: Transaction) => {
          tx.partialSign(platformWallet);
          return tx;
        },
        signAllTransactions: async (txs: Transaction[]) => {
          return txs.map(tx => {
            tx.partialSign(platformWallet);
            return tx;
          });
        },
      };

      // Log what we're about to pass
      this.logger.log('Creating partner config with params:');
      this.logger.log(`  config: ${configKeypair.publicKey.toBase58()}`);
      this.logger.log(`  feeClaimer: ${platformWallet.publicKey.toBase58()}`);
      this.logger.log(`  quoteMint: So11111111111111111111111111111111111111112`);
      this.logger.log(`  payer: ${wallet.publicKey.toBase58()}`);
      
      try {
        const configTx = await this.partnerService.createConfig({
          ...curveConfig,
          config: configKeypair,
          feeClaimer: platformWallet.publicKey,
          leftoverReceiver: platformWallet.publicKey,
          quoteMint: new PublicKey('So11111111111111111111111111111111111111112'),
          payer: wallet, // Pass wallet adapter with publicKey field
        });
        
        this.logger.log('✅ createConfig() succeeded!');
        
        // Store config key for future use
        // TODO: Save this to database
        this.platformConfigKey = configKeypair.publicKey;

        this.logger.log(`✅ Config created: ${this.platformConfigKey.toBase58()}`);

        return {
          configKey: this.platformConfigKey,
          transaction: configTx,
        };
      } catch (sdkError: any) {
        this.logger.error('SDK createConfig() error:', sdkError.message);
        this.logger.error('Error details:', JSON.stringify(sdkError, null, 2));
        throw sdkError;
      }
    } catch (error) {
      this.logger.error('Failed to create partner config:', error.message);
      this.logger.error('Error stack:', error.stack);
      throw new Error(`Partner config creation failed: ${error.message}`);
    }
  }

  /**
   * Create token + DBC pool in one transaction (pump.fun style)
   * Bot creates and pays, platform collects fees
   * Returns unsigned transaction that must be signed by: payer + mint keypair
   */
  async createTokenAndPool(params: {
    name: string;
    symbol: string;
    uri: string; // Metadata URI
    creatorWallet: PublicKey;
    creatorBotId: string;
    configKey: PublicKey; // Partner config key
    baseMintKeypair: Keypair; // Token mint keypair (server generates)
    firstBuyAmount?: number; // Optional initial buy in SOL
  }): Promise<{
    transaction: Transaction;
    poolAddress: PublicKey;
    tokenMint: PublicKey;
    mintKeypair: Keypair; // Return so caller can sign
  }> {
    try {
      this.logger.log('Creating token + DBC pool...');
      this.logger.log(`Name: ${params.name} (${params.symbol})`);
      this.logger.log(`Creator: ${params.creatorWallet.toBase58()}`);
      this.logger.log(`Config: ${params.configKey.toBase58()}`);
      this.logger.log(`Token Mint: ${params.baseMintKeypair.publicKey.toBase58()}`);

      const quoteMint = new PublicKey('So11111111111111111111111111111111111111112'); // Native SOL

      // Derive pool address deterministically
      const poolAddress = deriveDbcPoolAddress(
        quoteMint,
        params.baseMintKeypair.publicKey,
        params.configKey,
      );

      this.logger.log(`Derived pool address: ${poolAddress.toBase58()}`);

      // Build pool creation params
      const createPoolParam = {
        baseMint: params.baseMintKeypair.publicKey, // Pass PUBLIC KEY, not keypair
        name: params.name,
        symbol: params.symbol,
        uri: params.uri,
        poolCreator: params.creatorWallet,
        config: params.configKey,
        payer: params.creatorWallet,
      };

      // Build first buy params if provided
      const firstBuyParam = params.firstBuyAmount
        ? {
            buyer: params.creatorWallet,
            receiver: params.creatorWallet, // Optional: where to receive tokens
            buyAmount: new BN(params.firstBuyAmount * 1e9), // Correct param name
            minimumAmountOut: new BN(0), // Correct param name
            referralTokenAccount: null, // No referral
          }
        : undefined;

      // Create pool transaction (returns unsigned transaction)
      const result = await this.poolService.createPoolWithFirstBuy({
        createPoolParam,
        firstBuyParam,
      });

      this.logger.log(`✅ Token + pool transaction built!`);
      this.logger.log(`   Token Mint: ${params.baseMintKeypair.publicKey.toBase58()}`);
      this.logger.log(`   Pool: ${poolAddress.toBase58()}`);

      return {
        transaction: result.createPoolTx,
        poolAddress,
        tokenMint: params.baseMintKeypair.publicKey,
        mintKeypair: params.baseMintKeypair, // Return for signing
      };
    } catch (error) {
      this.logger.error('Failed to create token + pool:', error);
      throw new Error(`Token + pool creation failed: ${error.message}`);
    }
  }

  /**
   * Build unsigned transaction for token + pool creation
   * Transaction will be PARTIALLY signed with mint keypair
   * Bot still needs to sign with their wallet
   */
  async buildCreateTokenTransaction(params: {
    name: string;
    symbol: string;
    description: string;
    imageUrl?: string;
    creatorWallet: string;
    creatorBotId: string;
    firstBuyAmount?: number;
  }): Promise<{
    transaction: string; // Base64 encoded (partially signed)
    poolAddress: string;
    tokenMint: string;
  }> {
    try {
      // Get or create config
      if (!this.platformConfigKey) {
        // TODO: Load from database
        throw new Error('Platform config not initialized. Call /admin/create-config first.');
      }

      const creatorPubkey = new PublicKey(params.creatorWallet);

      // Generate token mint keypair (server-side, ephemeral)
      const baseMintKeypair = Keypair.generate();

      // Build metadata URI (upload to IPFS/Arweave in production)
      const metadataUri = await this.createMetadataUri({
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        image: params.imageUrl || '',
      });

      // Create token + pool transaction
      const result = await this.createTokenAndPool({
        name: params.name,
        symbol: params.symbol,
        uri: metadataUri,
        creatorWallet: creatorPubkey,
        creatorBotId: params.creatorBotId,
        configKey: this.platformConfigKey,
        baseMintKeypair,
        firstBuyAmount: params.firstBuyAmount,
      });

      // Get recent blockhash for the transaction
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      result.transaction.recentBlockhash = blockhash;
      result.transaction.feePayer = creatorPubkey;

      // Partially sign with mint keypair (server-side)
      // Bot will sign with their wallet before submitting
      result.transaction.partialSign(result.mintKeypair);

      // Serialize transaction (partially signed)
      const serialized = result.transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const transactionBase64 = serialized.toString('base64');

      this.logger.log(`✅ Transaction built & partially signed. Size: ${serialized.length} bytes`);
      this.logger.log(`   Mint signed: ✅`);
      this.logger.log(`   Bot signature needed: ⏳`);

      return {
        transaction: transactionBase64,
        poolAddress: result.poolAddress.toBase58(),
        tokenMint: result.tokenMint.toBase58(),
      };
    } catch (error) {
      this.logger.error('Failed to build transaction:', error);
      throw new Error(`Transaction build failed: ${error.message}`);
    }
  }

  /**
   * Create metadata URI (simplified - use IPFS/Arweave in production)
   */
  private async createMetadataUri(metadata: {
    name: string;
    symbol: string;
    description: string;
    image: string;
  }): Promise<string> {
    // TODO: Upload to IPFS/Arweave
    // For now, return a placeholder
    const metadataJson = {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      image: metadata.image,
      external_url: 'https://launchpad.example.com',
      attributes: [],
    };

    this.logger.log('TODO: Upload metadata to IPFS/Arweave');
    this.logger.log(`Metadata: ${JSON.stringify(metadataJson)}`);

    // Return placeholder for now
    return `https://arweave.net/placeholder-${metadata.symbol}`;
  }

  /**
   * Get pool info
   */
  async getPoolInfo(poolAddress: string): Promise<any> {
    try {
      const poolPubkey = new PublicKey(poolAddress);
      
      // Create DBC program instance
      const { program } = createDbcProgram(this.connection);
      
      // Fetch virtual pool account (DBC uses "virtualPool" account type)
      const poolAccount = await program.account.virtualPool.fetch(poolPubkey);
      
      // Get config to retrieve quoteMint
      const poolConfig = await program.account.poolConfig.fetch(poolAccount.config);
      
      return {
        poolAddress,
        baseMint: poolAccount.baseMint.toBase58(),
        quoteMint: poolConfig.quoteMint.toBase58(), // Get from config
        baseVault: poolAccount.baseVault.toBase58(),
        quoteVault: poolAccount.quoteVault.toBase58(),
        creator: poolAccount.creator.toBase58(),
        isMigrated: poolAccount.isMigrated, // Correct field name
        // Add more fields as needed
      };
    } catch (error) {
      this.logger.error('Failed to get pool info:', error);
      throw new Error(`Failed to get pool info: ${error.message}`);
    }
  }

  /**
   * Set platform config key (load from database)
   */
  setPlatformConfigKey(configKey: string) {
    this.platformConfigKey = new PublicKey(configKey);
    this.logger.log(`Platform config set: ${configKey}`);
  }
}
