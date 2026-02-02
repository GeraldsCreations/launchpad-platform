import { AppDataSource } from '../data-source';
import { Token } from '../entities/token.entity';
import { Trade } from '../entities/trade.entity';
import { PublicKey } from '@solana/web3.js';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    await AppDataSource.initialize();

    const tokenRepository = AppDataSource.getRepository(Token);
    const tradeRepository = AppDataSource.getRepository(Trade);

    // Clear existing data (optional)
    console.log('Clearing existing data...');
    await tradeRepository.delete({});
    await tokenRepository.delete({});

    // Seed tokens
    console.log('Creating sample tokens...');

    const tokens = [
      {
        address: PublicKey.unique().toBase58(),
        name: 'Gereld Bot',
        symbol: 'GERELD',
        description: 'AI Company Manager that runs your business',
        imageUrl: 'https://example.com/gereld.png',
        creator: PublicKey.unique().toBase58(),
        creatorType: 'clawdbot',
        bondingCurve: PublicKey.unique().toBase58(),
        currentPrice: 0.00015,
        marketCap: 15000,
        totalSupply: '100000000',
        holderCount: 42,
        volume24h: 123.45,
        graduated: false,
      },
      {
        address: PublicKey.unique().toBase58(),
        name: 'Moon Token',
        symbol: 'MOON',
        description: 'To the moon! 🚀',
        imageUrl: 'https://example.com/moon.png',
        creator: PublicKey.unique().toBase58(),
        creatorType: 'human',
        bondingCurve: PublicKey.unique().toBase58(),
        currentPrice: 0.0003,
        marketCap: 30000,
        totalSupply: '100000000',
        holderCount: 128,
        volume24h: 456.78,
        graduated: false,
      },
      {
        address: PublicKey.unique().toBase58(),
        name: 'Diamond Hands',
        symbol: 'DIAMOND',
        description: 'Graduated token with strong community',
        imageUrl: 'https://example.com/diamond.png',
        creator: PublicKey.unique().toBase58(),
        creatorType: 'human',
        bondingCurve: PublicKey.unique().toBase58(),
        currentPrice: 0.0005,
        marketCap: 69000,
        totalSupply: '1000000000',
        holderCount: 256,
        volume24h: 890.12,
        graduated: true,
        graduatedAt: new Date(),
      },
    ];

    for (const tokenData of tokens) {
      const token = tokenRepository.create(tokenData);
      await tokenRepository.save(token);
      console.log(`✅ Created token: ${token.symbol}`);

      // Create some sample trades for each token
      for (let i = 0; i < 5; i++) {
        const trade = tradeRepository.create({
          transactionSignature: PublicKey.unique().toBase58(),
          tokenAddress: token.address,
          trader: PublicKey.unique().toBase58(),
          side: i % 2 === 0 ? 'buy' : 'sell',
          amountSol: Math.random() * 5,
          amountTokens: Math.floor(Math.random() * 100000).toString(),
          price: token.currentPrice,
          fee: Math.random() * 0.05,
        });
        await tradeRepository.save(trade);
      }
    }

    console.log('✅ Database seeded successfully!');
    console.log(`Created ${tokens.length} tokens with sample trades`);

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
