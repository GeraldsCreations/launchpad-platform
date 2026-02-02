import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenFactory } from "../target/types/token_factory";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";

describe("Token Factory", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenFactory as Program<TokenFactory>;
  
  const creator = Keypair.generate();
  const feeCollector = Keypair.generate();

  before(async () => {
    await provider.connection.requestAirdrop(
      creator.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it("Creates a new token with metadata and bonding curve", async () => {
    const mintKeypair = Keypair.generate();
    const tokenMint = mintKeypair.publicKey;

    const [mintAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority"), tokenMint.toBuffer()],
      program.programId
    );

    const [metadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        tokenMint.toBuffer(),
      ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const bondingCurveProgram = anchor.workspace.BondingCurve.programId;

    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), tokenMint.toBuffer()],
      bondingCurveProgram
    );

    const [solVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("sol_vault"), tokenMint.toBuffer()],
      bondingCurveProgram
    );

    const name = "Test Token";
    const symbol = "TEST";
    const uri = "https://example.com/token.json";
    const basePrice = new anchor.BN(100_000);
    const maxSupply = new anchor.BN(1_000_000_000);

    const tx = await program.methods
      .createToken(name, symbol, uri, basePrice, maxSupply)
      .accounts({
        mint: tokenMint,
        mintAuthority,
        metadata,
        creator: creator.publicKey,
        bondingCurve,
        solVault,
        feeCollector: feeCollector.publicKey,
        bondingCurveProgram,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([creator, mintKeypair])
      .rpc();

    // Verify token was created
    const mintAccount = await provider.connection.getAccountInfo(tokenMint);
    expect(mintAccount).to.not.be.null;

    // Verify metadata was created
    const metadataAccount = await provider.connection.getAccountInfo(metadata);
    expect(metadataAccount).to.not.be.null;

    // Verify bonding curve was initialized (via CPI)
    const bondingCurveAccount = await provider.connection.getAccountInfo(bondingCurve);
    expect(bondingCurveAccount).to.not.be.null;
  });

  it("Validates token name length", async () => {
    const mintKeypair = Keypair.generate();
    const tokenMint = mintKeypair.publicKey;

    const [mintAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority"), tokenMint.toBuffer()],
      program.programId
    );

    const [metadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        tokenMint.toBuffer(),
      ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const bondingCurveProgram = anchor.workspace.BondingCurve.programId;
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), tokenMint.toBuffer()],
      bondingCurveProgram
    );
    const [solVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("sol_vault"), tokenMint.toBuffer()],
      bondingCurveProgram
    );

    const name = "A".repeat(33); // Too long
    const symbol = "TEST";
    const uri = "https://example.com/token.json";
    const basePrice = new anchor.BN(100_000);
    const maxSupply = new anchor.BN(1_000_000_000);

    try {
      await program.methods
        .createToken(name, symbol, uri, basePrice, maxSupply)
        .accounts({
          mint: tokenMint,
          mintAuthority,
          metadata,
          creator: creator.publicKey,
          bondingCurve,
          solVault,
          feeCollector: feeCollector.publicKey,
          bondingCurveProgram,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([creator, mintKeypair])
        .rpc();
      
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err.message).to.include("NameTooLong");
    }
  });

  it("Validates symbol length", async () => {
    const mintKeypair = Keypair.generate();
    const tokenMint = mintKeypair.publicKey;

    const [mintAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority"), tokenMint.toBuffer()],
      program.programId
    );

    const [metadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        tokenMint.toBuffer(),
      ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const bondingCurveProgram = anchor.workspace.BondingCurve.programId;
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), tokenMint.toBuffer()],
      bondingCurveProgram
    );
    const [solVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("sol_vault"), tokenMint.toBuffer()],
      bondingCurveProgram
    );

    const name = "Test Token";
    const symbol = "VERYLONGSYMBOL"; // Too long
    const uri = "https://example.com/token.json";
    const basePrice = new anchor.BN(100_000);
    const maxSupply = new anchor.BN(1_000_000_000);

    try {
      await program.methods
        .createToken(name, symbol, uri, basePrice, maxSupply)
        .accounts({
          mint: tokenMint,
          mintAuthority,
          metadata,
          creator: creator.publicKey,
          bondingCurve,
          solVault,
          feeCollector: feeCollector.publicKey,
          bondingCurveProgram,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([creator, mintKeypair])
        .rpc();
      
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err.message).to.include("SymbolTooLong");
    }
  });

  it("Validates base price", async () => {
    const mintKeypair = Keypair.generate();
    const tokenMint = mintKeypair.publicKey;

    const [mintAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority"), tokenMint.toBuffer()],
      program.programId
    );

    const [metadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        tokenMint.toBuffer(),
      ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const bondingCurveProgram = anchor.workspace.BondingCurve.programId;
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), tokenMint.toBuffer()],
      bondingCurveProgram
    );
    const [solVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("sol_vault"), tokenMint.toBuffer()],
      bondingCurveProgram
    );

    const name = "Test Token";
    const symbol = "TEST";
    const uri = "https://example.com/token.json";
    const basePrice = new anchor.BN(0); // Invalid
    const maxSupply = new anchor.BN(1_000_000_000);

    try {
      await program.methods
        .createToken(name, symbol, uri, basePrice, maxSupply)
        .accounts({
          mint: tokenMint,
          mintAuthority,
          metadata,
          creator: creator.publicKey,
          bondingCurve,
          solVault,
          feeCollector: feeCollector.publicKey,
          bondingCurveProgram,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([creator, mintKeypair])
        .rpc();
      
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err.message).to.include("InvalidBasePrice");
    }
  });
});
