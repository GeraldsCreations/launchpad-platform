import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BondingCurve } from "../target/types/bonding_curve";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { expect } from "chai";

describe("Bonding Curve", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BondingCurve as Program<BondingCurve>;
  
  let tokenMint: PublicKey;
  let bondingCurve: PublicKey;
  let solVault: PublicKey;
  let buyerTokenAccount: PublicKey;
  let sellerTokenAccount: PublicKey;
  
  const creator = Keypair.generate();
  const buyer = Keypair.generate();
  const seller = Keypair.generate();
  const feeCollector = Keypair.generate();
  
  const BASE_PRICE = new anchor.BN(100_000); // 0.0001 SOL
  const MAX_SUPPLY = new anchor.BN(1_000_000_000); // 1B tokens

  before(async () => {
    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(
      creator.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      buyer.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      seller.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    
    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create mint
    tokenMint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      9 // decimals
    );

    // Derive PDAs
    [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), tokenMint.toBuffer()],
      program.programId
    );

    [solVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("sol_vault"), tokenMint.toBuffer()],
      program.programId
    );
  });

  it("Initializes bonding curve", async () => {
    const tx = await program.methods
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

    const curveAccount = await program.account.bondingCurve.fetch(bondingCurve);
    
    expect(curveAccount.tokenMint.toString()).to.equal(tokenMint.toString());
    expect(curveAccount.creator.toString()).to.equal(creator.publicKey.toString());
    expect(curveAccount.basePrice.toNumber()).to.equal(BASE_PRICE.toNumber());
    expect(curveAccount.maxSupply.toNumber()).to.equal(MAX_SUPPLY.toNumber());
    expect(curveAccount.tokenSupply.toNumber()).to.equal(0);
    expect(curveAccount.solReserves.toNumber()).to.equal(0);
    expect(curveAccount.graduated).to.be.false;
  });

  it("Buys tokens", async () => {
    // Create buyer token account
    const buyerTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer,
      tokenMint,
      buyer.publicKey
    );
    buyerTokenAccount = buyerTokenAccountInfo.address;

    const solAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);
    const minTokensOut = new anchor.BN(0); // Accept any amount for test

    const buyerBalanceBefore = await provider.connection.getBalance(buyer.publicKey);

    const tx = await program.methods
      .buy(solAmount, minTokensOut)
      .accounts({
        bondingCurve,
        tokenMint,
        buyer: buyer.publicKey,
        buyerTokenAccount,
        solVault,
        feeCollector: feeCollector.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const buyerBalanceAfter = await provider.connection.getBalance(buyer.publicKey);
    const tokenBalance = await provider.connection.getTokenAccountBalance(buyerTokenAccount);
    const curveAccount = await program.account.bondingCurve.fetch(bondingCurve);

    // Buyer should have spent SOL (amount + fee + tx fee)
    expect(buyerBalanceBefore - buyerBalanceAfter).to.be.greaterThan(solAmount.toNumber());
    
    // Buyer should have received tokens
    expect(parseInt(tokenBalance.value.amount)).to.be.greaterThan(0);
    
    // Curve supply should have increased
    expect(curveAccount.tokenSupply.toNumber()).to.be.greaterThan(0);
    
    // Curve reserves should have increased
    expect(curveAccount.solReserves.toNumber()).to.be.greaterThan(0);
  });

  it("Sells tokens", async () => {
    const curveAccountBefore = await program.account.bondingCurve.fetch(bondingCurve);
    const tokenBalance = await provider.connection.getTokenAccountBalance(buyerTokenAccount);
    
    // Sell half of tokens
    const tokenAmount = new anchor.BN(parseInt(tokenBalance.value.amount) / 2);
    const minSolOut = new anchor.BN(0);

    const buyerBalanceBefore = await provider.connection.getBalance(buyer.publicKey);

    const tx = await program.methods
      .sell(tokenAmount, minSolOut)
      .accounts({
        bondingCurve,
        tokenMint,
        seller: buyer.publicKey,
        sellerTokenAccount: buyerTokenAccount,
        solVault,
        feeCollector: feeCollector.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const buyerBalanceAfter = await provider.connection.getBalance(buyer.publicKey);
    const tokenBalanceAfter = await provider.connection.getTokenAccountBalance(buyerTokenAccount);
    const curveAccountAfter = await program.account.bondingCurve.fetch(bondingCurve);

    // Buyer should have received SOL
    expect(buyerBalanceAfter).to.be.greaterThan(buyerBalanceBefore);
    
    // Token balance should have decreased
    expect(parseInt(tokenBalanceAfter.value.amount)).to.be.lessThan(parseInt(tokenBalance.value.amount));
    
    // Curve supply should have decreased
    expect(curveAccountAfter.tokenSupply.toNumber()).to.be.lessThan(curveAccountBefore.tokenSupply.toNumber());
  });

  it("Gets current price", async () => {
    const price = await program.methods
      .getPrice()
      .accounts({
        bondingCurve,
      })
      .view();

    expect(price.toNumber()).to.be.greaterThan(BASE_PRICE.toNumber());
  });

  it("Fails to buy after graduation", async () => {
    // First graduate the curve
    await program.methods
      .graduate()
      .accounts({
        bondingCurve,
        graduationHandler: creator.publicKey,
      })
      .signers([creator])
      .rpc();

    // Try to buy - should fail
    const solAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const minTokensOut = new anchor.BN(0);

    try {
      await program.methods
        .buy(solAmount, minTokensOut)
        .accounts({
          bondingCurve,
          tokenMint,
          buyer: buyer.publicKey,
          buyerTokenAccount,
          solVault,
          feeCollector: feeCollector.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
      
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err.message).to.include("CurveGraduated");
    }
  });

  it("Enforces slippage protection on buy", async () => {
    // Create new curve for this test
    const newMint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      9
    );

    const [newCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), newMint.toBuffer()],
      program.programId
    );

    const [newVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("sol_vault"), newMint.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeCurve(BASE_PRICE, MAX_SUPPLY)
      .accounts({
        bondingCurve: newCurve,
        tokenMint: newMint,
        creator: creator.publicKey,
        feeCollector: feeCollector.publicKey,
        solVault: newVault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const newBuyerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer,
      newMint,
      buyer.publicKey
    );

    const solAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const minTokensOut = new anchor.BN(999_999_999_999); // Unrealistically high

    try {
      await program.methods
        .buy(solAmount, minTokensOut)
        .accounts({
          bondingCurve: newCurve,
          tokenMint: newMint,
          buyer: buyer.publicKey,
          buyerTokenAccount: newBuyerTokenAccount.address,
          solVault: newVault,
          feeCollector: feeCollector.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
      
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err.message).to.include("SlippageExceeded");
    }
  });
});
