import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, Logs } from '@solana/web3.js';
import { TokenRepository } from '../database/repositories/token.repository';
import { TradeRepository } from '../database/repositories/trade.repository';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { BlockchainService } from '../public-api/services/blockchain.service';

interface ParsedTokenCreatedEvent {
  type: 'token_created';
  tokenAddress: string;
  name: string;
  symbol: string;
  creator: string;
  bondingCurve: string;
}

interface ParsedTradeEvent {
  type: 'trade';
  signature: string;
  tokenAddress: string;
  trader: string;
  side: 'buy' | 'sell';
  amountSol: number;
  amountTokens: string;
  price: number;
}

interface ParsedGraduationEvent {
  type: 'graduation';
  tokenAddress: string;
  raydiumPool: string;
}

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private connection: Connection;
  private wsConnection: Connection;
  private subscriptionId: number | null = null;
  private isRunning: boolean = false;
  private bondingCurveProgramId: PublicKey;
  private platformConfigKey: PublicKey;
  private lastProcessedSlot: number = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenRepository: TokenRepository,
    private readonly tradeRepository: TradeRepository,
    private readonly websocketGateway: WebsocketGateway,
    private readonly blockchainService: BlockchainService,
  ) {
    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL') || 'https://api.devnet.solana.com';
    
    // Connection class handles WebSockets internally - use http(s) URL for both
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.wsConnection = new Connection(rpcUrl, 'confirmed');
    
    this.bondingCurveProgramId = new PublicKey(
      this.configService.get<string>('BONDING_CURVE_PROGRAM_ID') || 'BondCurve11111111111111111111111111111111',
    );
    
    // Our platform config - ONLY index tokens created with this config
    const configKey = this.configService.get<string>('DBC_PLATFORM_CONFIG_KEY');
    if (!configKey) {
      throw new Error('DBC_PLATFORM_CONFIG_KEY not set in environment variables');
    }
    this.platformConfigKey = new PublicKey(configKey);
    
    this.logger.log(`🔒 Indexer will ONLY track tokens from config: ${this.platformConfigKey.toBase58()}`);
  }

  async onModuleInit() {
    this.logger.log('Starting blockchain indexer...');
    await this.start();
  }

  async onModuleDestroy() {
    this.logger.log('Stopping blockchain indexer...');
    await this.stop();
  }

  /**
   * Start listening to blockchain events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Indexer is already running');
      return;
    }

    this.isRunning = true;

    try {
      // Subscribe to program logs
      this.subscriptionId = this.wsConnection.onLogs(
        this.bondingCurveProgramId,
        (logs: Logs) => {
          this.processLogs(logs);
        },
        'confirmed',
      );

      this.logger.log(`📡 Subscribed to DBC program: ${this.bondingCurveProgramId.toBase58()}`);
      this.logger.log(`🔒 Filtering for platform config: ${this.platformConfigKey.toBase58()}`);
      this.logger.log('✅ Indexer started - ONLY tracking our platform tokens');

      // Start periodic sync check
      this.startSyncMonitor();
    } catch (error) {
      this.logger.error('Failed to start indexer:', error);
      this.isRunning = false;
    }
  }

  /**
   * Stop listening to blockchain events
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.subscriptionId !== null) {
      await this.wsConnection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
    }

    this.isRunning = false;
    this.logger.log('Indexer stopped');
  }

  /**
   * Process transaction logs
   * ONLY processes transactions that involve our platform config
   */
  private async processLogs(logs: Logs): Promise<void> {
    try {
      this.lastProcessedSlot = (logs as any).context?.slot || this.lastProcessedSlot;

      // FILTER: Only process transactions involving our platform config
      const isOurTransaction = await this.isOurPlatformTransaction(logs.signature);
      
      if (!isOurTransaction) {
        this.logger.debug(`⏭️  Skipping transaction ${logs.signature} - not from our platform config`);
        return;
      }

      this.logger.log(`✅ Processing OUR transaction: ${logs.signature}`);

      // Parse logs to extract events
      const events = this.parseLogMessages(logs.logs, logs.signature);

      // Process each event
      for (const event of events) {
        await this.handleEvent(event);
      }
    } catch (error) {
      this.logger.error(`Error processing logs for ${logs.signature}:`, error);
    }
  }

  /**
   * Check if transaction involves our platform config
   * Returns true only if the transaction was created using our DBC config
   */
  private async isOurPlatformTransaction(signature: string): Promise<boolean> {
    try {
      // Fetch the full transaction to inspect accounts
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx || !tx.transaction) {
        return false;
      }

      // Check if our platform config key is mentioned in the transaction accounts
      const accountKeys = tx.transaction.message.accountKeys.map(key => 
        typeof key === 'string' ? key : key.pubkey.toBase58()
      );

      const platformConfigAddress = this.platformConfigKey.toBase58();
      const isOurs = accountKeys.includes(platformConfigAddress);

      if (isOurs) {
        this.logger.log(`🎯 Found transaction using our config: ${platformConfigAddress}`);
      }

      return isOurs;
    } catch (error) {
      this.logger.error(`Error checking transaction ${signature}:`, error);
      return false; // Skip on error to be safe
    }
  }

  /**
   * Parse log messages to extract structured events
   */
  private parseLogMessages(
    logs: string[],
    signature: string,
  ): Array<ParsedTokenCreatedEvent | ParsedTradeEvent | ParsedGraduationEvent> {
    const events: Array<ParsedTokenCreatedEvent | ParsedTradeEvent | ParsedGraduationEvent> = [];

    // This is simplified - in production, you'd parse actual program logs
    // For now, we'll simulate event detection

    for (const log of logs) {
      if (log.includes('TokenCreated')) {
        // Simulated token creation event
        // In reality, parse the actual event data from logs
        this.logger.debug(`Detected TokenCreated event in ${signature}`);
      } else if (log.includes('TokenPurchased')) {
        // Simulated buy event
        this.logger.debug(`Detected TokenPurchased event in ${signature}`);
      } else if (log.includes('TokenSold')) {
        // Simulated sell event
        this.logger.debug(`Detected TokenSold event in ${signature}`);
      } else if (log.includes('TokenGraduated')) {
        // Simulated graduation event
        this.logger.debug(`Detected TokenGraduated event in ${signature}`);
      }
    }

    return events;
  }

  /**
   * Handle parsed event
   */
  private async handleEvent(
    event: ParsedTokenCreatedEvent | ParsedTradeEvent | ParsedGraduationEvent,
  ): Promise<void> {
    try {
      switch (event.type) {
        case 'token_created':
          await this.handleTokenCreated(event);
          break;
        case 'trade':
          await this.handleTrade(event);
          break;
        case 'graduation':
          await this.handleGraduation(event);
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling event ${event.type}:`, error);
    }
  }

  /**
   * Handle token creation event
   */
  private async handleTokenCreated(event: ParsedTokenCreatedEvent): Promise<void> {
    this.logger.log(`New token created: ${event.tokenAddress}`);

    // Check if already exists
    const existing = await this.tokenRepository.findByAddress(event.tokenAddress);
    if (existing) {
      return;
    }

    // Create token record
    const token = await this.tokenRepository.create({
      address: event.tokenAddress,
      name: event.name,
      symbol: event.symbol,
      creator: event.creator,
      bondingCurve: event.bondingCurve,
      currentPrice: 0.0001,
      marketCap: 0,
      totalSupply: '0',
      holderCount: 0,
      volume24h: 0,
      graduated: false,
    });

    // Emit WebSocket event
    this.websocketGateway.emitTokenCreated(
      token.address,
      token.name,
      token.symbol,
      token.creator,
      token.creatorType,
    );
  }

  /**
   * Handle trade event
   */
  private async handleTrade(event: ParsedTradeEvent): Promise<void> {
    this.logger.log(`Trade detected: ${event.side} ${event.tokenAddress}`);

    // Check if trade already processed
    const existing = await this.tradeRepository.findBySignature(event.signature);
    if (existing) {
      return;
    }

    // Get token
    const token = await this.tokenRepository.findByAddress(event.tokenAddress);
    if (!token) {
      this.logger.warn(`Token not found for trade: ${event.tokenAddress}`);
      return;
    }

    // Record trade
    const fee = event.amountSol * 0.01;
    await this.tradeRepository.create({
      transactionSignature: event.signature,
      tokenAddress: event.tokenAddress,
      trader: event.trader,
      side: event.side,
      amountSol: event.amountSol,
      amountTokens: event.amountTokens,
      price: event.price,
      fee,
    });

    // Update token price and volume
    const volume = await this.tradeRepository.get24hVolume(event.tokenAddress);
    await this.tokenRepository.updateVolume(event.tokenAddress, volume);

    // Emit WebSocket events
    this.websocketGateway.emitTrade(
      event.tokenAddress,
      event.side,
      event.amountSol,
      event.amountTokens,
      event.trader,
      event.price,
    );

    this.websocketGateway.emitPriceUpdate(
      event.tokenAddress,
      event.price,
      token.marketCap,
      volume,
    );
  }

  /**
   * Handle token graduation event
   */
  private async handleGraduation(event: ParsedGraduationEvent): Promise<void> {
    this.logger.log(`Token graduated: ${event.tokenAddress}`);

    await this.tokenRepository.markGraduated(event.tokenAddress);
  }

  /**
   * Monitor sync status
   */
  private startSyncMonitor(): void {
    setInterval(async () => {
      try {
        const currentSlot = await this.connection.getSlot('confirmed');
        const lag = currentSlot - this.lastProcessedSlot;

        if (lag > 10) {
          this.logger.warn(`Indexer lag detected: ${lag} slots behind`);
        }

        this.logger.debug(`Indexer status: slot ${this.lastProcessedSlot}, lag ${lag} slots`);
      } catch (error) {
        this.logger.error('Error checking sync status:', error);
      }
    }, 60000); // Check every 60 seconds (reduced to avoid rate limits)
  }

  /**
   * Get indexer status
   */
  getStatus(): {
    isRunning: boolean;
    lastProcessedSlot: number;
    programId: string;
  } {
    return {
      isRunning: this.isRunning,
      lastProcessedSlot: this.lastProcessedSlot,
      programId: this.bondingCurveProgramId.toBase58(),
    };
  }
}
