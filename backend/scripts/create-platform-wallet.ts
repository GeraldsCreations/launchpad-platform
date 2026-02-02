#!/usr/bin/env ts-node
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Create platform wallet for DBC configuration
 * This wallet will be the fee claimer and config authority
 */

const platformWallet = Keypair.generate();

console.log('🔐 Platform Wallet Created!');
console.log('');
console.log('Public Key:', platformWallet.publicKey.toBase58());
console.log('');
console.log('⚠️  SAVE THIS PRIVATE KEY SECURELY:');
console.log('');
console.log(JSON.stringify(Array.from(platformWallet.secretKey)));
console.log('');
console.log('📝 Add to .env:');
console.log('');
console.log(`PLATFORM_WALLET_KEYPAIR='${JSON.stringify(Array.from(platformWallet.secretKey))}'`);
console.log('');
console.log('💰 Fund this wallet on devnet:');
console.log(`solana airdrop 5 ${platformWallet.publicKey.toBase58()} --url devnet`);
console.log('');
console.log('Or visit: https://faucet.solana.com');
