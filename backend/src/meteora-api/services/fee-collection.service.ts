import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { MeteoraService } from './meteora.service';
import { FeeClaimerVault } from '../../database/entities/fee-claimer-vault.entity';
import { BotCreatorReward } from '../../database/entities/bot-creator-reward.entity';
import { MeteoraPool } from '../entities/meteora-pool.entity';

@Injectable()
export class FeeCollectionService {
  private readonly logger = new Logger(FeeCollectionService.name);
  
  // Platform wallet (should be loaded from env or config)
  private readonly platformWallet: Keypair;

  constructor(
    private meteoraService: MeteoraService,
    @InjectRepository(FeeClaimerVault)
    private vaultRepository: Repository<FeeClaimerVault>,
    @InjectRepository(BotCreatorReward)
    private rewardRepository: Repository<BotCreatorReward>,
    @InjectRepository(MeteoraPool)
    private poolRepository: Repository<MeteoraPool>,
  ) {
    // In production, load from secure env variable
    // For now, generate a keypair (this would be your platform's main wallet)
    this.platformWallet = Keypair.generate();
    this.logger.warn(
      `Platform wallet: ${this.platformWallet.publicKey.toBase58()}`,
    );
  }

  /**
   * Create fee claimer vault when launching a token
   */
  async createFeeClaimerVault(
    poolAddress: string,
    tokenAddress: string,
  ): Promise<FeeClaimerVault> {
    try {
      const connection = this.meteoraService.getConnection();

      // Derive fee claimer vault PDA (Program Derived Address)
      // In production, use Meteora's actual PDA derivation
      console.log('[PublicKey] fee-collection.service.ts:55 - Before creating PublicKey from poolAddress for PDA:', poolAddress);
      const poolPubkeyForPDA = new PublicKey(poolAddress);
      console.log('[PublicKey] fee-collection.service.ts:55 - After creating PublicKey:', poolPubkeyForPDA.toBase58());
      
      console.log('[PublicKey] fee-collection.service.ts:56 - Creating PublicKey for Meteora DLMM program');
      const meteoraProgramId = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');
      console.log('[PublicKey] fee-collection.service.ts:56 - Created DLMM program PublicKey:', meteoraProgramId.toBase58());
      
      const [feeClaimerPDA] = await PublicKey.findProgramAddress(
        [Buffer.from('fee_claimer'), poolPubkeyForPDA.toBuffer()],
        meteoraProgramId, // Meteora DLMM program
      );

      this.logger.log(
        `Created fee claimer vault: ${feeClaimerPDA.toBase58()} for pool ${poolAddress}`,
      );

      // Save to database
      const vault = this.vaultRepository.create({
        poolAddress,
        tokenAddress,
        feeClaimerPubkey: feeClaimerPDA.toBase58(),
        totalFeesCollected: 0,
        claimedFees: 0,
        unclaimedFees: 0,
        claimCount: 0,
      });

      return await this.vaultRepository.save(vault);
    } catch (error) {
      this.logger.error('Failed to create fee claimer vault:', error);
      throw error;
    }
  }

  /**
   * Collect fees from all pools (scheduled job - run hourly)
   */
  async collectAllFees(): Promise<{
    collected: number;
    poolsProcessed: number;
    totalAmount: number;
  }> {
    this.logger.log('Starting fee collection job...');

    const vaults = await this.vaultRepository.find({
      where: {
        // Only claim if last claim was > 1 hour ago (or never claimed)
        lastClaimAt: LessThan(new Date(Date.now() - 60 * 60 * 1000)),
      },
    });

    let collected = 0;
    let totalAmount = 0;

    for (const vault of vaults) {
      try {
        const amount = await this.claimFeesForVault(vault);
        if (amount > 0) {
          collected++;
          totalAmount += amount;
        }
      } catch (error) {
        this.logger.error(
          `Failed to collect fees for vault ${vault.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Fee collection completed: ${collected} vaults, ${totalAmount} SOL collected`,
    );

    return {
      collected,
      poolsProcessed: vaults.length,
      totalAmount,
    };
  }

  /**
   * Claim fees for a specific vault
   */
  async claimFeesForVault(vault: FeeClaimerVault): Promise<number> {
    const connection = this.meteoraService.getConnection();

    try {
      // Get DLMM instance
      const dlmm = await this.meteoraService.getDLMM(vault.poolAddress);

      // Check available fees
      const feeInfo = await dlmm.getFeeInfo();
      
      // In production, use actual fee info from Meteora
      // For now, simulate checking balance
      console.log('[PublicKey] fee-collection.service.ts:150 - Before creating PublicKey from vault.feeClaimerPubkey:', vault.feeClaimerPubkey);
      const feeClaimerPubkey = new PublicKey(vault.feeClaimerPubkey);
      console.log('[PublicKey] fee-collection.service.ts:150 - After creating PublicKey:', feeClaimerPubkey.toBase58());
      const balance = await connection.getBalance(feeClaimerPubkey);
      const availableFees = balance / LAMPORTS_PER_SOL;

      if (availableFees < 0.01) {
        // Less than 0.01 SOL, not worth claiming yet
        return 0;
      }

      this.logger.log(
        `Claiming ${availableFees} SOL from vault ${vault.feeClaimerPubkey}`,
      );

      // Create claim transaction
      // In production, use Meteora SDK's claimFee method
      const claimTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: feeClaimerPubkey,
          toPubkey: this.platformWallet.publicKey,
          lamports: balance,
        }),
      );

      // Sign and send (in production, this would be a CPI from Meteora program)
      const signature = await sendAndConfirmTransaction(
        connection,
        claimTx,
        [this.platformWallet],
        { commitment: 'confirmed' },
      );

      // Update vault
      vault.totalFeesCollected = Number(vault.totalFeesCollected) + availableFees;
      vault.claimedFees = Number(vault.claimedFees) + availableFees;
      vault.unclaimedFees = 0;
      vault.lastClaimAt = new Date();
      vault.claimCount = Number(vault.claimCount) + 1;

      await this.vaultRepository.save(vault);

      // Distribute rewards to bot creator (50/50 split)
      await this.distributeCreatorRewards(vault, availableFees);

      this.logger.log(
        `Successfully claimed ${availableFees} SOL from vault ${vault.id}`,
      );

      return availableFees;
    } catch (error) {
      this.logger.error(`Failed to claim fees for vault ${vault.id}:`, error);
      throw error;
    }
  }

  /**
   * Distribute rewards to bot creator (50% of fees)
   */
  private async distributeCreatorRewards(
    vault: FeeClaimerVault,
    feeAmount: number,
  ): Promise<void> {
    try {
      // Get pool info
      const pool = await this.poolRepository.findOne({
        where: { poolAddress: vault.poolAddress },
      });

      if (!pool || !pool.creatorBotId) {
        // No bot creator, all fees go to platform
        this.logger.log(
          `No bot creator for pool ${vault.poolAddress}, platform keeps 100%`,
        );
        return;
      }

      // Calculate creator's share (50%)
      const creatorShare = feeAmount * (pool.creatorRevenueSharePercent / 100);
      const platformShare = feeAmount - creatorShare;

      this.logger.log(
        `Distributing rewards: Platform: ${platformShare} SOL, Bot ${pool.creatorBotId}: ${creatorShare} SOL`,
      );

      // Find or create bot reward record
      let reward = await this.rewardRepository.findOne({
        where: {
          botId: pool.creatorBotId,
          poolAddress: vault.poolAddress,
        },
      });

      if (!reward) {
        reward = this.rewardRepository.create({
          botId: pool.creatorBotId,
          botWallet: pool.creatorBotWallet,
          poolAddress: vault.poolAddress,
          tokenAddress: vault.tokenAddress,
          totalFeesEarned: 0,
          claimedAmount: 0,
          unclaimedAmount: 0,
          revenueSharePercent: pool.creatorRevenueSharePercent,
          claimed: false,
        });
      }

      // Update reward amounts
      reward.totalFeesEarned = Number(reward.totalFeesEarned) + creatorShare;
      reward.unclaimedAmount = Number(reward.unclaimedAmount) + creatorShare;

      await this.rewardRepository.save(reward);

      this.logger.log(
        `Bot ${pool.creatorBotId} earned ${creatorShare} SOL (total unclaimed: ${reward.unclaimedAmount})`,
      );
    } catch (error) {
      this.logger.error('Failed to distribute creator rewards:', error);
      // Don't throw - we don't want fee collection to fail if reward distribution fails
    }
  }

  /**
   * Get bot's total rewards
   */
  async getBotRewards(botId: string): Promise<{
    totalEarned: number;
    claimed: number;
    unclaimed: number;
    poolCount: number;
    rewards: BotCreatorReward[];
  }> {
    const rewards = await this.rewardRepository.find({
      where: { botId },
    });

    const totalEarned = rewards.reduce(
      (sum, r) => sum + Number(r.totalFeesEarned),
      0,
    );
    const claimed = rewards.reduce((sum, r) => sum + Number(r.claimedAmount), 0);
    const unclaimed = rewards.reduce(
      (sum, r) => sum + Number(r.unclaimedAmount),
      0,
    );

    return {
      totalEarned,
      claimed,
      unclaimed,
      poolCount: rewards.length,
      rewards,
    };
  }

  /**
   * Claim rewards for a bot (generates unsigned transaction)
   */
  async claimBotRewards(
    botId: string,
    botWallet: string,
  ): Promise<{
    transaction: string;
    amount: number;
    message: string;
  }> {
    const connection = this.meteoraService.getConnection();

    try {
      // Get all unclaimed rewards
      const rewards = await this.rewardRepository.find({
        where: {
          botId,
          claimed: false,
        },
      });

      if (rewards.length === 0) {
        throw new Error('No unclaimed rewards available');
      }

      // Calculate total amount
      const totalAmount = rewards.reduce(
        (sum, r) => sum + Number(r.unclaimedAmount),
        0,
      );

      if (totalAmount < 0.01) {
        throw new Error('Minimum claim amount is 0.01 SOL');
      }

      this.logger.log(
        `Generating claim transaction for bot ${botId}: ${totalAmount} SOL`,
      );

      // Create transfer transaction
      console.log('[PublicKey] fee-collection.service.ts:346 - Before creating PublicKey from botWallet:', botWallet);
      const recipientPubkey = new PublicKey(botWallet);
      console.log('[PublicKey] fee-collection.service.ts:346 - After creating PublicKey:', recipientPubkey.toBase58());
      const lamports = Math.floor(totalAmount * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.platformWallet.publicKey,
          toPubkey: recipientPubkey,
          lamports,
        }),
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.platformWallet.publicKey;

      // Serialize transaction (base64)
      const serialized = transaction
        .serialize({ requireAllSignatures: false })
        .toString('base64');

      // Note: In production, bot would sign this transaction and send it back
      // For now, we'll auto-sign and send
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [this.platformWallet],
        { commitment: 'confirmed' },
      );

      // Update rewards as claimed
      for (const reward of rewards) {
        reward.claimedAmount =
          Number(reward.claimedAmount) + Number(reward.unclaimedAmount);
        reward.unclaimedAmount = 0;
        reward.claimed = true;
        reward.lastClaimAt = new Date();
        reward.lastClaimSignature = signature;

        await this.rewardRepository.save(reward);
      }

      this.logger.log(
        `Successfully paid ${totalAmount} SOL to bot ${botId} (tx: ${signature})`,
      );

      return {
        transaction: serialized,
        amount: totalAmount,
        message: `Successfully claimed ${totalAmount} SOL`,
      };
    } catch (error) {
      this.logger.error(`Failed to claim bot rewards:`, error);
      throw error;
    }
  }

  /**
   * Get leaderboard of top earning bots
   */
  async getBotLeaderboard(limit: number = 10): Promise<
    {
      botId: string;
      botWallet: string;
      totalEarned: number;
      poolCount: number;
    }[]
  > {
    const rewards = await this.rewardRepository
      .createQueryBuilder('reward')
      .select('reward.botId', 'botId')
      .addSelect('reward.botWallet', 'botWallet')
      .addSelect('SUM(reward.totalFeesEarned)', 'totalEarned')
      .addSelect('COUNT(DISTINCT reward.poolAddress)', 'poolCount')
      .groupBy('reward.botId')
      .addGroupBy('reward.botWallet')
      .orderBy('SUM(reward.totalFeesEarned)', 'DESC')
      .limit(limit)
      .getRawMany();

    return rewards.map((r) => ({
      botId: r.botId,
      botWallet: r.botWallet,
      totalEarned: parseFloat(r.totalEarned),
      poolCount: parseInt(r.poolCount),
    }));
  }

  /**
   * Get platform stats
   */
  async getPlatformStats(): Promise<{
    totalFeesCollected: number;
    totalVaults: number;
    totalBotRewards: number;
    totalClaimed: number;
    totalUnclaimed: number;
  }> {
    const vaults = await this.vaultRepository
      .createQueryBuilder('vault')
      .select('SUM(vault.totalFeesCollected)', 'total')
      .addSelect('COUNT(vault.id)', 'count')
      .getRawOne();

    const rewards = await this.rewardRepository
      .createQueryBuilder('reward')
      .select('SUM(reward.totalFeesEarned)', 'total')
      .addSelect('SUM(reward.claimedAmount)', 'claimed')
      .addSelect('SUM(reward.unclaimedAmount)', 'unclaimed')
      .getRawOne();

    return {
      totalFeesCollected: parseFloat(vaults.total || 0),
      totalVaults: parseInt(vaults.count || 0),
      totalBotRewards: parseFloat(rewards.total || 0),
      totalClaimed: parseFloat(rewards.claimed || 0),
      totalUnclaimed: parseFloat(rewards.unclaimed || 0),
    };
  }
}
