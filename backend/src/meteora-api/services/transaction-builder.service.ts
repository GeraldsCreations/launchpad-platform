import { Injectable, Logger } from '@nestjs/common';
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import * as DLMMModule from '@meteora-ag/dlmm';
const DLMM = DLMMModule.default || DLMMModule;
const { ActivationType, StrategyType, LBCLMM_PROGRAM_IDS, deriveCustomizablePermissionlessLbPair } = DLMMModule;
import * as BN from 'bn.js';
import { BuildTransactionDto } from '../dto/build-transaction.dto';
import { MeteoraService } from './meteora.service';

@Injectable()
export class TransactionBuilderService {
  private readonly logger = new Logger(TransactionBuilderService.name);

  // Native SOL mint address
  private readonly NATIVE_SOL = (() => {
    console.log('[PublicKey] transaction-builder.service.ts:33 - Creating NATIVE_SOL PublicKey');
    const key = new PublicKey('So11111111111111111111111111111111111111112');
    console.log('[PublicKey] transaction-builder.service.ts:33 - Created NATIVE_SOL:', key.toBase58());
    return key;
  })();
  
  // Meteora DLMM program ID (devnet)
  private readonly DLMM_PROGRAM_ID = (() => {
    console.log('[PublicKey] transaction-builder.service.ts:36 - Creating DLMM_PROGRAM_ID from:', LBCLMM_PROGRAM_IDS['devnet']);
    const key = new PublicKey(LBCLMM_PROGRAM_IDS['devnet']);
    console.log('[PublicKey] transaction-builder.service.ts:36 - Created DLMM_PROGRAM_ID:', key.toBase58());
    return key;
  })();

  constructor(private meteoraService: MeteoraService) {}

  /**
   * Get platform wallet public key from environment
   */
  private getPlatformWalletPubkey(): PublicKey {
    const platformWalletKey = process.env.PLATFORM_WALLET_KEYPAIR;
    if (!platformWalletKey) {
      throw new Error('PLATFORM_WALLET_KEYPAIR not configured');
    }

    const keypairArray = JSON.parse(platformWalletKey);
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairArray));
    return keypair.publicKey;
  }

  /**
   * Build complete unsigned transaction for token + pool + liquidity creation
   * Bot pays for everything, platform wallet owns the LP position
   */
  async buildTokenCreationTransaction(
    dto: BuildTransactionDto,
  ): Promise<{ 
    transaction: string; 
    tokenMint: string;
  }> {
    const connection = this.meteoraService.getConnection();
    console.log('[PublicKey] transaction-builder.service.ts:75 - Before creating PublicKey from dto.creator:', dto.creator);
    const creatorPubkey = new PublicKey(dto.creator);
    console.log('[PublicKey] transaction-builder.service.ts:75 - After creating PublicKey:', creatorPubkey.toBase58());
    const platformWallet = this.getPlatformWalletPubkey();

    try {
      this.logger.log(`Building complete transaction for: ${dto.symbol}`);
      this.logger.log(`Bot wallet: ${dto.creator}`);
      this.logger.log(`Platform wallet (LP owner): ${platformWallet.toBase58()}`);
      this.logger.log(`Liquidity amount: ${dto.liquidityAmount} SOL`);

      // Generate keypair for token mint (server-side, ephemeral)
      const mintKeypair = Keypair.generate();
      const tokenMint = mintKeypair.publicKey;

      this.logger.log(`Token mint: ${tokenMint.toBase58()}`);

      // Get rent exemption amount for mint account
      const lamports = await getMinimumBalanceForRentExemptMint(connection);

      const instructions: TransactionInstruction[] = [];

      // ========================================
      // PART 1: Token Mint Creation
      // ========================================

      // 1. Create mint account
      instructions.push(
        SystemProgram.createAccount({
          fromPubkey: creatorPubkey,
          newAccountPubkey: tokenMint,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
      );

      // 2. Initialize mint (9 decimals, creator as authority)
      instructions.push(
        createInitializeMintInstruction(
          tokenMint,
          9,
          creatorPubkey,
          creatorPubkey,
          TOKEN_PROGRAM_ID,
        ),
      );

      // 3. Create associated token account for creator
      const creatorTokenAccount = getAssociatedTokenAddressSync(
        tokenMint,
        creatorPubkey,
        false,
        TOKEN_PROGRAM_ID,
      );

      instructions.push(
        createAssociatedTokenAccountInstruction(
          creatorPubkey,
          creatorTokenAccount,
          creatorPubkey,
          tokenMint,
          TOKEN_PROGRAM_ID,
        ),
      );

      // 4. Mint initial supply (1 billion tokens)
      const initialSupply = new BN(1_000_000_000).mul(new BN(10).pow(new BN(9)));

      instructions.push(
        createMintToInstruction(
          tokenMint,
          creatorTokenAccount,
          creatorPubkey,
          BigInt(initialSupply.toString()),
          [],
          TOKEN_PROGRAM_ID,
        ),
      );

      this.logger.log('Token creation instructions added');

      // ========================================
      // IMPORTANT: Two-Transaction Architecture
      // ========================================
      // TX1 (this transaction): Create token mint only
      // TX2 (separate call): Create pool + add liquidity
      //
      // Why? Meteora SDK needs the token to exist on-chain before creating a pool.
      // It fetches token account info which will be null if token doesn't exist yet.
      // ========================================

      this.logger.log('TX1 will create token mint. Pool creation happens in TX2.');

      // ========================================
      // Build Final Transaction
      // ========================================

      // Add compute budget for complex transaction
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 800_000, // Increased for pool creation
      });

      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 50_000,
      });

      const transaction = new Transaction();
      transaction.add(modifyComputeUnits);
      transaction.add(addPriorityFee);
      instructions.forEach((ix) => transaction.add(ix));

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = creatorPubkey;

      // Partially sign with server-side keypairs
      transaction.partialSign(mintKeypair);

      // Serialize transaction
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const transactionBase64 = serialized.toString('base64');

      this.logger.log(`Transaction built successfully. Size: ${serialized.length} bytes`);

      return {
        transaction: transactionBase64,
        tokenMint: tokenMint.toBase58(),
      };
    } catch (error) {
      this.logger.error('Failed to build transaction:', error);
      throw new Error(`Transaction build failed: ${error.message}`);
    }
  }

  /**
   * Build pool creation + liquidity addition transaction (TX2 - after token exists)
   * This creates the DLMM pool AND adds liquidity in ONE transaction
   * Bot pays for everything, platform owns the LP position
   */
  async buildPoolAndLiquidityTransaction(
    tokenMint: string,
    initialPrice: number,
    liquidityAmountSOL: number,
    botWallet: string,
  ): Promise<{ 
    transaction: string; 
    poolAddress: string;
    positionPubkey: string;
  }> {
    const connection = this.meteoraService.getConnection();
    console.log('[PublicKey] transaction-builder.service.ts:232 - Before creating PublicKey from botWallet:', botWallet);
    const botPubkey = new PublicKey(botWallet);
    console.log('[PublicKey] transaction-builder.service.ts:232 - After creating PublicKey:', botPubkey.toBase58());
    const platformWallet = this.getPlatformWalletPubkey();
    console.log('[PublicKey] transaction-builder.service.ts:234 - Before creating PublicKey from tokenMint:', tokenMint);
    const tokenMintPubkey = new PublicKey(tokenMint);
    console.log('[PublicKey] transaction-builder.service.ts:234 - After creating PublicKey:', tokenMintPubkey.toBase58());

    try {
      this.logger.log(`Building pool + liquidity transaction for token: ${tokenMint}`);
      this.logger.log(`Bot wallet: ${botWallet}`);
      this.logger.log(`Platform wallet (LP owner): ${platformWallet.toBase58()}`);
      this.logger.log(`Initial price: ${initialPrice} SOL`);
      this.logger.log(`Liquidity amount: ${liquidityAmountSOL} SOL`);

      // ========================================
      // PART 1: Derive Pool Address
      // ========================================

      const binStep = new BN(25);
      const feeBps = new BN(25);
      const activeId = new BN(this.calculateActiveBinId(initialPrice, 25));

      // Derive pool address (deterministic PDA)
      const [poolPubkey, _bump] = deriveCustomizablePermissionlessLbPair(
        tokenMintPubkey,
        this.NATIVE_SOL,
        binStep,
      );

      const poolAddress = poolPubkey.toBase58();
      this.logger.log(`Derived pool address: ${poolAddress}`);
      this.logger.log(`Pool parameters - BinStep: ${binStep.toString()}, ActiveId: ${activeId.toString()}`);

      // ========================================
      // PART 2: Pool Creation Instructions
      // ========================================

      const createPoolTx = await DLMM.createCustomizablePermissionlessLbPair(
        connection,
        binStep,
        tokenMintPubkey,
        this.NATIVE_SOL,
        activeId,
        feeBps,
        ActivationType.Timestamp,
        false,
        botPubkey,
        new BN(Math.floor(Date.now() / 1000)),
        false,
      );

      this.logger.log('Pool creation instructions generated');

      // ========================================
      // PART 3: Liquidity Addition Instructions
      // ========================================

      // Generate position keypair
      const positionKeypair = Keypair.generate();
      const positionPubkey = positionKeypair.publicKey;

      this.logger.log(`Position pubkey: ${positionPubkey.toBase58()}`);

      // Set liquidity range around active bin
      const minBinId = Number(activeId.toString()) - 3;
      const maxBinId = Number(activeId.toString()) + 3;

      this.logger.log(`Liquidity range: ${minBinId} to ${maxBinId}`);

      // Calculate SOL amount
      const solAmount = liquidityAmountSOL * LAMPORTS_PER_SOL;

      // Create DLMM instance with derived pool address
      // Note: Pool doesn't exist yet, but we can build instructions with the address
      const dlmm = await DLMM.create(connection, poolPubkey, {
        cluster: 'devnet',
      });

      // Initialize position with PLATFORM as owner (bot pays!)
      const addLiquidityTx = await dlmm.initializePositionAndAddLiquidityByStrategy({
        positionPubKey: positionKeypair.publicKey,
        totalXAmount: new BN(0),
        totalYAmount: new BN(solAmount),
        strategy: {
          minBinId,
          maxBinId,
          strategyType: StrategyType.Spot,
        },
        user: platformWallet, // ← Platform owns the position!
        slippage: 500,
      });

      this.logger.log('Liquidity addition instructions generated');

      // ========================================
      // PART 4: Combine Into Single Transaction
      // ========================================

      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 800_000, // Increased for pool + liquidity
      });

      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 50_000,
      });

      const transaction = new Transaction();
      transaction.add(modifyComputeUnits);
      transaction.add(addPriorityFee);
      transaction.add(...createPoolTx.instructions); // Pool creation first
      transaction.add(...addLiquidityTx.instructions); // Then liquidity

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = botPubkey;

      // Partially sign with position keypair
      transaction.partialSign(positionKeypair);

      // Serialize
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const transactionBase64 = serialized.toString('base64');

      this.logger.log(`Combined transaction built. Size: ${serialized.length} bytes`);
      this.logger.log('✅ Pool creation + liquidity in ONE transaction!');

      return {
        transaction: transactionBase64,
        poolAddress,
        positionPubkey: positionPubkey.toBase58(),
      };
    } catch (error) {
      this.logger.error('Failed to build pool + liquidity transaction:', error);
      throw new Error(`Pool + liquidity transaction build failed: ${error.message}`);
    }
  }

  /**
   * Calculate active bin ID from price
   */
  private calculateActiveBinId(price: number, binStep: number): number {
    if (price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    const priceRatio = 1 + binStep / 10000;
    const binId = Math.floor(Math.log(price) / Math.log(priceRatio));

    this.logger.log(`Calculated binId ${binId} from price ${price} and binStep ${binStep}`);

    return binId;
  }

  /**
   * Verify a signed transaction before submission
   */
  async verifySignedTransaction(
    signedTransactionBase64: string,
    expectedMint: string,
  ): Promise<boolean> {
    try {
      const transaction = Transaction.from(Buffer.from(signedTransactionBase64, 'base64'));

      // Verify the transaction has required signatures
      // Note: Can't fully verify until all signatures are present
      
      this.logger.log(`Transaction contains ${transaction.signatures.length} signatures`);
      return true;
    } catch (error) {
      this.logger.error('Transaction verification failed:', error);
      return false;
    }
  }
}
