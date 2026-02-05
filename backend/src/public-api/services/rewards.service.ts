import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { MeteoraPool } from '../../meteora-api/entities/meteora-pool.entity';
import {
  DynamicBondingCurveClient,
  CreatorService,
  PartnerService,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import * as BN from 'bn.js';

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);
  private connection: Connection;
  private dbcClient: DynamicBondingCurveClient;
  private creatorService: CreatorService;
  private partnerService: PartnerService;

  constructor(
    @InjectRepository(MeteoraPool)
    private poolRepository: Repository<MeteoraPool>,
    private configService: ConfigService,
  ) {
    const rpcUrl = this.configService.get('SOLANA_RPC_URL');
    this.connection = new Connection(rpcUrl, 'confirmed');

    // Initialize DBC client (pass Connection and commitment)
    this.dbcClient = DynamicBondingCurveClient.create(this.connection, 'confirmed');
    this.creatorService = this.dbcClient.creator;
    this.partnerService = this.dbcClient.partner;

    this.logger.log('✅ DBC CreatorService and PartnerService initialized');
  }

  /**
   * Get platform wallet keypair
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
   * Get bot creator's claimable fees from DBC pool
   * Uses on-chain data, no database needed!
   */
  async getBotRewards(botWallet: string): Promise<{
    totalClaimable: number;
    pools: Array<{
      poolAddress: string;
      tokenAddress: string;
      claimableAmount: number;
    }>;
  }> {
    try {
      // Find all pools created by this bot
      const pools = await this.poolRepository.find({
        where: { creatorBotWallet: botWallet },
      });

      if (pools.length === 0) {
        return {
          totalClaimable: 0,
          pools: [],
        };
      }

      let totalClaimable = 0;
      const poolsWithFees: Array<{
        poolAddress: string;
        tokenAddress: string;
        claimableAmount: number;
      }> = [];

      // Check each pool for claimable creator fees
      for (const pool of pools) {
        try {
          // Get pool fees from DBC
          console.log('[PublicKey] rewards.service.ts:87 - Before creating PublicKey from pool.poolAddress:', pool.poolAddress);
          const poolPubkey = new PublicKey(pool.poolAddress);
          console.log('[PublicKey] rewards.service.ts:87 - After creating PublicKey:', poolPubkey.toBase58());
          const feeBreakdown = await this.dbcClient.state.getPoolFeeBreakdown(poolPubkey);

          if (!feeBreakdown) {
            continue;
          }

          // Calculate creator's claimable amount (unclaimed fees in quote token = SOL)
          const claimableAmount = Number(feeBreakdown.creator.unclaimedQuoteFee.toString()) / 1e9;

          if (claimableAmount > 0) {
            totalClaimable += claimableAmount;
            poolsWithFees.push({
              poolAddress: pool.poolAddress,
              tokenAddress: pool.tokenAddress,
              claimableAmount,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to check fees for pool ${pool.poolAddress}:`, error.message);
        }
      }

      return {
        totalClaimable,
        pools: poolsWithFees,
      };
    } catch (error) {
      this.logger.error('Failed to get bot rewards:', error);
      throw error;
    }
  }

  /**
   * Build claim transaction using DBC's CreatorService
   * Bot creator signs and submits to claim their fees
   */
  async buildClaimTransaction(
    poolAddress: string,
    creatorWallet: string,
  ): Promise<{
    transaction: string; // Base64 serialized transaction
    estimatedAmount: number; // SOL
  }> {
    try {
      this.logger.log(`Building creator fee claim for pool: ${poolAddress}`);

      console.log('[PublicKey] rewards.service.ts:137 - Before creating PublicKey from poolAddress:', poolAddress);
      const poolPubkey = new PublicKey(poolAddress);
      console.log('[PublicKey] rewards.service.ts:137 - After creating PublicKey:', poolPubkey.toBase58());
      
      console.log('[PublicKey] rewards.service.ts:138 - Before creating PublicKey from creatorWallet:', creatorWallet);
      const creatorPubkey = new PublicKey(creatorWallet);
      console.log('[PublicKey] rewards.service.ts:138 - After creating PublicKey:', creatorPubkey.toBase58());

      // Verify this is actually the pool creator
      const pool = await this.poolRepository.findOne({
        where: { poolAddress },
      });

      if (!pool) {
        throw new NotFoundException(`Pool ${poolAddress} not found`);
      }

      if (pool.creatorBotWallet?.toLowerCase() !== creatorWallet.toLowerCase()) {
        throw new Error('Wallet is not the creator of this pool');
      }

      // Get pool fees to check claimable amount
      const feeBreakdown = await this.dbcClient.state.getPoolFeeBreakdown(poolPubkey);
      
      if (!feeBreakdown) {
        throw new NotFoundException(`Pool fee data not found for ${poolAddress}`);
      }

      // Creator's unclaimed fees (quote token = SOL)
      const estimatedAmount = Number(feeBreakdown.creator.unclaimedQuoteFee.toString()) / 1e9;

      if (estimatedAmount < 0.001) {
        throw new Error('Claimable amount too small (minimum 0.001 SOL)');
      }

      // Build claim transaction using DBC CreatorService
      // Pass u64::MAX for amounts to claim all available
      const claimTx = await this.creatorService.claimCreatorTradingFee({
        creator: creatorPubkey,
        pool: poolPubkey,
        payer: creatorPubkey,
        maxBaseAmount: new BN('18446744073709551615'), // u64::MAX
        maxQuoteAmount: new BN('18446744073709551615'), // u64::MAX
      });

      // Serialize transaction
      const serialized = claimTx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const transactionBase64 = serialized.toString('base64');

      this.logger.log(
        `✅ Creator claim transaction built: ${estimatedAmount} SOL from pool ${poolAddress}`,
      );

      return {
        transaction: transactionBase64,
        estimatedAmount,
      };
    } catch (error) {
      this.logger.error('Failed to build claim transaction:', error);
      throw error;
    }
  }

  /**
   * Claim platform fees (partner share)
   * Called by our automated scheduler
   */
  async claimPlatformFees(poolAddress: string): Promise<{
    signature: string;
    amount: number;
  }> {
    try {
      this.logger.log(`Claiming platform fees from pool: ${poolAddress}`);

      console.log('[PublicKey] rewards.service.ts:214 - Before creating PublicKey from poolAddress:', poolAddress);
      const poolPubkey = new PublicKey(poolAddress);
      console.log('[PublicKey] rewards.service.ts:214 - After creating PublicKey:', poolPubkey.toBase58());
      const platformWallet = this.getPlatformWalletKeypair();

      // Get pool fees to check claimable amount
      const feeBreakdown = await this.dbcClient.state.getPoolFeeBreakdown(poolPubkey);

      if (!feeBreakdown) {
        this.logger.warn(`Pool fee data not found for ${poolAddress}`);
        return { signature: '', amount: 0 };
      }

      // Platform's unclaimed fees (quote token = SOL)
      const claimableAmount = Number(feeBreakdown.partner.unclaimedQuoteFee.toString()) / 1e9;

      if (claimableAmount < 0.01) {
        this.logger.log(`Skipping pool ${poolAddress}: only ${claimableAmount} SOL available`);
        return {
          signature: '',
          amount: 0,
        };
      }

      // Build claim transaction using DBC PartnerService
      // Pass u64::MAX for amounts to claim all available
      const claimTx = await this.partnerService.claimPartnerTradingFee({
        feeClaimer: platformWallet.publicKey,
        payer: platformWallet.publicKey,
        pool: poolPubkey,
        maxBaseAmount: new BN('18446744073709551615'), // u64::MAX
        maxQuoteAmount: new BN('18446744073709551615'), // u64::MAX
      });

      // Sign and send
      claimTx.partialSign(platformWallet);

      const signature = await this.connection.sendRawTransaction(claimTx.serialize(), {
        skipPreflight: false,
      });

      await this.connection.confirmTransaction(signature, 'confirmed');

      this.logger.log(
        `✅ Platform claimed ${claimableAmount} SOL from pool ${poolAddress} (tx: ${signature})`,
      );

      return {
        signature,
        amount: claimableAmount,
      };
    } catch (error) {
      this.logger.error(`Failed to claim platform fees from pool ${poolAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get top earning bot creators
   * Based on pools they've created (not tracking claims)
   */
  async getTopEarners(limit: number = 10): Promise<
    Array<{
      botWallet: string;
      poolCount: number;
      estimatedEarnings: number;
    }>
  > {
    try {
      // Group pools by creator
      const creators = await this.poolRepository
        .createQueryBuilder('pool')
        .select('pool.creatorBotWallet', 'botWallet')
        .addSelect('COUNT(pool.poolAddress)', 'poolCount')
        .where('pool.creatorBotWallet IS NOT NULL')
        .groupBy('pool.creatorBotWallet')
        .orderBy('COUNT(pool.poolAddress)', 'DESC')
        .limit(limit)
        .getRawMany();

      // For each creator, check total claimable fees
      const creatorsWithEarnings: Array<{
        botWallet: string;
        poolCount: number;
        estimatedEarnings: number;
      }> = [];

      for (const creator of creators) {
        try {
          const rewards = await this.getBotRewards(creator.botWallet);
          creatorsWithEarnings.push({
            botWallet: creator.botWallet,
            poolCount: parseInt(creator.poolCount, 10),
            estimatedEarnings: rewards.totalClaimable,
          });
        } catch (error) {
          this.logger.warn(`Failed to check earnings for ${creator.botWallet}`);
        }
      }

      // Sort by earnings
      return creatorsWithEarnings.sort((a, b) => b.estimatedEarnings - a.estimatedEarnings);
    } catch (error) {
      this.logger.error('Failed to get leaderboard:', error);
      throw error;
    }
  }

  /**
   * Claim all platform fees from all pools
   * Called by automated scheduler
   */
  async claimAllPlatformFees(): Promise<{
    poolsProcessed: number;
    totalClaimed: number;
    signatures: string[];
  }> {
    this.logger.log('Starting platform fee collection from all pools...');

    const pools = await this.poolRepository.find();
    let totalClaimed = 0;
    const signatures: string[] = [];

    for (const pool of pools) {
      try {
        const result = await this.claimPlatformFees(pool.poolAddress);
        if (result.amount > 0) {
          totalClaimed += result.amount;
          signatures.push(result.signature);
        }
      } catch (error) {
        this.logger.error(`Failed to claim from pool ${pool.poolAddress}:`, error.message);
      }
    }

    this.logger.log(
      `✅ Platform fee collection complete: ${signatures.length}/${pools.length} pools, ${totalClaimed} SOL claimed`,
    );

    return {
      poolsProcessed: pools.length,
      totalClaimed,
      signatures,
    };
  }
}
