import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { BotCreatorReward } from '../../database/entities/bot-creator-reward.entity';

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);
  private connection: Connection;

  constructor(
    @InjectRepository(BotCreatorReward)
    private rewardRepository: Repository<BotCreatorReward>,
    private configService: ConfigService,
  ) {
    const rpcUrl = this.configService.get('SOLANA_RPC_URL');
    this.connection = new Connection(rpcUrl, 'confirmed');
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
   * Get bot creator rewards summary
   */
  async getBotRewards(botWallet: string): Promise<{
    totalEarned: number;
    claimed: number;
    unclaimed: number;
    pools: Array<{
      poolAddress: string;
      tokenAddress: string;
      earned: number;
      claimed: boolean;
    }>;
  }> {
    const rewards = await this.rewardRepository.find({
      where: { botWallet },
    });

    if (rewards.length === 0) {
      return {
        totalEarned: 0,
        claimed: 0,
        unclaimed: 0,
        pools: [],
      };
    }

    const totalEarned = rewards.reduce((sum, r) => sum + Number(r.totalFeesEarned), 0);
    const claimed = rewards.reduce((sum, r) => sum + Number(r.claimedAmount), 0);
    const unclaimed = rewards.reduce((sum, r) => sum + Number(r.unclaimedAmount), 0);

    const pools = rewards.map(r => ({
      poolAddress: r.poolAddress,
      tokenAddress: r.tokenAddress,
      earned: Number(r.totalFeesEarned),
      claimed: r.claimed,
    }));

    return {
      totalEarned,
      claimed,
      unclaimed,
      pools,
    };
  }

  /**
   * Build claim transaction for bot creator to sign
   * Transfers unclaimed fees from platform wallet to bot wallet
   */
  async buildClaimTransaction(botWallet: string): Promise<{
    amount: number; // Lamports
    amountSol: number; // SOL
    transaction: string; // Base64 serialized transaction
  }> {
    // Get all unclaimed rewards for this bot
    const rewards = await this.rewardRepository.find({
      where: { 
        botWallet,
        claimed: false,
      },
    });

    if (rewards.length === 0) {
      throw new NotFoundException('No unclaimed rewards found');
    }

    // Calculate total unclaimed amount
    const totalUnclaimed = rewards.reduce(
      (sum, r) => sum + Number(r.unclaimedAmount),
      0
    );

    if (totalUnclaimed < 0.001) {
      throw new Error('Unclaimed amount too small (minimum 0.001 SOL)');
    }

    const amountLamports = Math.floor(totalUnclaimed * LAMPORTS_PER_SOL);

    this.logger.log(`Building claim transaction for ${botWallet}: ${totalUnclaimed} SOL`);

    // Get platform wallet
    const platformWallet = this.getPlatformWalletKeypair();

    // Check platform wallet balance
    const balance = await this.connection.getBalance(platformWallet.publicKey);
    if (balance < amountLamports) {
      throw new Error(
        `Insufficient platform wallet balance. Need: ${totalUnclaimed} SOL, Have: ${balance / LAMPORTS_PER_SOL} SOL`
      );
    }

    // Build transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: platformWallet.publicKey,
        toPubkey: new PublicKey(botWallet),
        lamports: amountLamports,
      })
    );

    // Add recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = platformWallet.publicKey;

    // Sign with platform wallet
    transaction.partialSign(platformWallet);

    // Serialize transaction
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const transactionBase64 = serialized.toString('base64');

    // Mark rewards as claimed (will be finalized when transaction is confirmed)
    // NOTE: In production, you'd want to verify the transaction before marking as claimed
    for (const reward of rewards) {
      reward.claimed = true;
      reward.claimedAmount = Number(reward.claimedAmount) + Number(reward.unclaimedAmount);
      reward.unclaimedAmount = 0;
      reward.lastClaimAt = new Date();
      await this.rewardRepository.save(reward);
    }

    this.logger.log(`✅ Claim transaction built: ${totalUnclaimed} SOL to ${botWallet}`);

    return {
      amount: amountLamports,
      amountSol: totalUnclaimed,
      transaction: transactionBase64,
    };
  }

  /**
   * Get top earning bots
   */
  async getTopEarners(limit: number = 10): Promise<Array<{
    botId: string;
    botWallet: string;
    totalEarned: number;
    claimed: number;
    unclaimed: number;
    poolCount: number;
  }>> {
    const rewards = await this.rewardRepository.find();

    // Group by bot wallet
    const botMap = new Map<string, {
      botId: string;
      botWallet: string;
      totalEarned: number;
      claimed: number;
      unclaimed: number;
      poolCount: number;
    }>();

    for (const reward of rewards) {
      const existing = botMap.get(reward.botWallet);
      
      if (existing) {
        existing.totalEarned += Number(reward.totalFeesEarned);
        existing.claimed += Number(reward.claimedAmount);
        existing.unclaimed += Number(reward.unclaimedAmount);
        existing.poolCount += 1;
      } else {
        botMap.set(reward.botWallet, {
          botId: reward.botId,
          botWallet: reward.botWallet,
          totalEarned: Number(reward.totalFeesEarned),
          claimed: Number(reward.claimedAmount),
          unclaimed: Number(reward.unclaimedAmount),
          poolCount: 1,
        });
      }
    }

    // Sort by total earned
    const sorted = Array.from(botMap.values())
      .sort((a, b) => b.totalEarned - a.totalEarned)
      .slice(0, limit);

    return sorted;
  }
}
