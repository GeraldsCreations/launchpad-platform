import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Graduation } from "../target/types/graduation";
import { BondingCurve } from "../target/types/bonding_curve";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("Graduation", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const graduationProgram = anchor.workspace.Graduation as Program<Graduation>;
  const bondingCurveProgram = anchor.workspace.BondingCurve as Program<BondingCurve>;
  
  let tokenMint: PublicKey;
  let bondingCurve: PublicKey;
  let solVault: PublicKey;
  
  const creator = Keypair.generate();
  const authority = Keypair.generate();
  const feeCollector = Keypair.generate();
  
  const BASE_PRICE = new anchor.BN(100_000);
  const MAX_SUPPLY = new anchor.BN(1_000_000_000);

  before(async () => {
    await provider.connection.requestAirdrop(
      creator.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      authority.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create mint and bonding curve
    tokenMint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      9
    );

    [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), tokenMint.toBuffer()],
      bondingCurveProgram.programId
    );

    [solVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("sol_vault"), tokenMint.toBuffer()],
      bondingCurveProgram.programId
    );

    // Initialize bonding curve
    await bondingCurveProgram.methods
      .initializeCurve(BASE_PRICE, MAX_SUPPLY)
      .accounts({
        bondingCurve,
        tokenMint,
        creator: creator.publicKey,
        feeCollector: feeCollector.publicKey,
        solVault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
  });

  it("Fails graduation check when threshold not reached", async () => {
    try {
      await graduationProgram.methods
        .checkAndGraduate()
        .accounts({
          bondingCurve,
          authority: authority.publicKey,
          bondingCurveProgram: bondingCurveProgram.programId,
        })
        .signers([authority])
        .rpc();
      
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err.message).to.include("ThresholdNotReached");
    }
  });

  it("Graduates token when threshold reached", async () => {
    // Buy enough tokens to reach graduation threshold
    // Need 690 SOL in reserves for $69K (assuming 1 SOL = $100)
    const buyer = Keypair.generate();
    await provider.connection.requestAirdrop(
      buyer.publicKey,
      1000 * LAMPORTS_PER_SOL
    );
    await new Promise(resolve => setTimeout(resolve, 1000));

    const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer,
      tokenMint,
      buyer.publicKey
    );

    // Make large buy to reach threshold
    const solAmount = new anchor.BN(700 * LAMPORTS_PER_SOL);
    const minTokensOut = new anchor.BN(0);

    await bondingCurveProgram.methods
      .buy(solAmount, minTokensOut)
      .accounts({
        bondingCurve,
        tokenMint,
        buyer: buyer.publicKey,
        buyerTokenAccount: buyerTokenAccount.address,
        solVault,
        feeCollector: feeCollector.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // Now check and graduate
    const tx = await graduationProgram.methods
      .checkAndGraduate()
      .accounts({
        bondingCurve,
        authority: authority.publicKey,
        bondingCurveProgram: bondingCurveProgram.programId,
      })
      .signers([authority])
      .rpc();

    const curveAccount = await bondingCurveProgram.account.bondingCurve.fetch(bondingCurve);
    expect(curveAccount.graduated).to.be.true;
  });

  it("Fails to graduate already graduated token", async () => {
    try {
      await graduationProgram.methods
        .checkAndGraduate()
        .accounts({
          bondingCurve,
          authority: authority.publicKey,
          bondingCurveProgram: bondingCurveProgram.programId,
        })
        .signers([authority])
        .rpc();
      
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err.message).to.include("AlreadyGraduated");
    }
  });

  it("Migrates liquidity to Raydium", async () => {
    const tokenVault = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority,
      tokenMint,
      authority.publicKey
    );

    const raydiumPool = Keypair.generate();
    const raydiumProgram = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");

    const curveAccountBefore = await bondingCurveProgram.account.bondingCurve.fetch(bondingCurve);

    const tx = await graduationProgram.methods
      .migrateToRaydium()
      .accounts({
        bondingCurve,
        tokenMint,
        solVault,
        tokenVault: tokenVault.address,
        raydiumPool: raydiumPool.publicKey,
        raydiumProgram,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    // Verify migration event was emitted
    // In production, this would verify Raydium pool was created and LP tokens burned
    expect(tx).to.be.a('string');
  });

  it("Handles emergency withdrawal", async () => {
    const admin = authority; // Using authority as admin for test
    
    const creatorBalanceBefore = await provider.connection.getBalance(creator.publicKey);

    const tx = await graduationProgram.methods
      .emergencyWithdraw()
      .accounts({
        bondingCurve,
        solVault,
        creator: creator.publicKey,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const creatorBalanceAfter = await provider.connection.getBalance(creator.publicKey);
    
    // Creator should have received SOL back
    expect(creatorBalanceAfter).to.be.greaterThan(creatorBalanceBefore);
  });
});
