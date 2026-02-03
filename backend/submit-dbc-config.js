const { Connection, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
require('dotenv').config();

async function submitConfig() {
  // The transaction from the API response
  const txBase64 = "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADdrKfCh9gKHmxtpMIE+gJIx+EF4imwnuGpGGrlJ0VRFnnqGvzLUEw8zbMa3dzUrQsxczULIZMbsQKw6+4f2TEHAgAEBs/mq8PnYOtTzwKoGc+xXWxjvteh6BysbWdhexcrVihp62x/YFbcTTzPO3n0Ap+XBVLmzEAY1bDgKBZiErjgaycAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGzWzIDHsAskwhAgOEM/SKoPyo7n6BkDPA/h+6co3/UMCWAMpST3sbfWzLHDlzqgMw0ZA9pgHMm13uPGYrTK0UkGm4hX/quBhPtof2NGGMA12sQ53BrrO1WYoPAAAAAAAaJ6unB5rGDxt/jyFMywscg5j/90xjXn2QrxLQav7ALpAQQIAQAABQACAwSDAsnP83JLby+9gJaYAAAAAAAKAMAhAAAAAAAAsHELAAAAAAAAAAABAQAJLQUtBdCt/WEvAgAAg7xUtjeJQQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAZKeztuANAABkp7O24A0yAAAAAAAAAIDw+gIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAALmFnCE3Ps8AAAAAAAAAAABTU79BW10g3RtQDbqM8gMAm1dpTqkaXISxxP7/AAAAAIwnN99qZ6hO3S+LCgAAAAA=";
  
  const rpcUrl = process.env.SOLANA_RPC_URL;
  const platformWalletArray = JSON.parse(process.env.PLATFORM_WALLET_KEYPAIR);
  
  console.log('🚀 Submitting DBC config to Solana...');
  console.log(`RPC: ${rpcUrl}`);
  
  const connection = new Connection(rpcUrl, 'confirmed');
  const platformWallet = Keypair.fromSecretKey(new Uint8Array(platformWalletArray));
  
  console.log(`Platform wallet: ${platformWallet.publicKey.toBase58()}`);
  
  // Check balance
  const balance = await connection.getBalance(platformWallet.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);
  
  if (balance < 0.1 * 1e9) {
    console.error('❌ Insufficient balance! Need at least 0.1 SOL');
    return;
  }
  
  // Deserialize transaction (already partially signed with config keypair)
  const txBuffer = Buffer.from(txBase64, 'base64');
  const transaction = Transaction.from(txBuffer);
  
  console.log(`Current signatures: ${transaction.signatures.length}`);
  console.log(`Signatures needed: ${transaction.instructions.length > 0 ? 'Yes' : 'No'}`);
  
  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  
  // Add platform wallet signature (config keypair already signed via partialSign)
  console.log('✍️  Adding platform wallet signature...');
  transaction.partialSign(platformWallet);
  
  // Submit
  console.log('📡 Broadcasting to network...');
  const rawTx = transaction.serialize();
  const signature = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  });
  
  // Wait for confirmation
  console.log('⏳ Waiting for confirmation...');
  await connection.confirmTransaction(signature, 'confirmed');
  
  console.log(`✅ Config submitted successfully!`);
  console.log(`Signature: ${signature}`);
  console.log(`Explorer: https://solscan.io/tx/${signature}?cluster=devnet`);
  console.log(`\nConfig key: GqzmMgfp99p93q4Vkr9Z3dk5JxVHFaMEgKB5kBV9Mfxz`);
}

submitConfig().catch(console.error);
