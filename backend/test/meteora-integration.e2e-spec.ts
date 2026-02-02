import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection, Keypair } from '@solana/web3.js';

describe('Meteora Integration (e2e)', () => {
  let app: INestApplication;
  let testWallet: Keypair;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Generate test wallet
    testWallet = Keypair.generate();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Token Creation', () => {
    it('POST /api/v1/tokens/create - should create a new token and pool', async () => {
      const createTokenDto = {
        name: 'Test Token',
        symbol: 'TEST',
        description: 'A test token on devnet',
        initialPrice: 0.000001,
        initialLiquidity: 5,
        binStep: 25,
        feeBps: 25,
        creator: testWallet.publicKey.toBase58(),
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/tokens/create')
        .send(createTokenDto)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('poolAddress');
      expect(response.body).toHaveProperty('tokenAddress');
      expect(response.body).toHaveProperty('signature');
      expect(response.body).toHaveProperty('launchFee', 1);
    });

    it('POST /api/v1/tokens/create - should fail with invalid data', async () => {
      const invalidDto = {
        name: 'Test Token',
        symbol: 'TEST',
        // Missing required fields
      };

      await request(app.getHttpServer())
        .post('/api/v1/tokens/create')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('Trading', () => {
    let poolAddress: string;
    let tokenAddress: string;

    beforeAll(async () => {
      // Create a test pool first
      const createTokenDto = {
        name: 'Trade Test Token',
        symbol: 'TTT',
        initialPrice: 0.000001,
        initialLiquidity: 10,
        creator: testWallet.publicKey.toBase58(),
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/tokens/create')
        .send(createTokenDto);

      poolAddress = response.body.poolAddress;
      tokenAddress = response.body.tokenAddress;
    });

    it('POST /api/v1/trade/buy - should buy tokens', async () => {
      const buyDto = {
        poolAddress,
        solAmount: 0.1,
        wallet: testWallet.publicKey.toBase58(),
        slippage: 0.05,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/trade/buy')
        .send(buyDto)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('signature');
      expect(response.body).toHaveProperty('tokenAmount');
      expect(response.body).toHaveProperty('platformFee');
    });

    it('POST /api/v1/trade/sell - should sell tokens', async () => {
      const sellDto = {
        poolAddress,
        tokenAmount: 1000,
        wallet: testWallet.publicKey.toBase58(),
        slippage: 0.05,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/trade/sell')
        .send(sellDto)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('signature');
      expect(response.body).toHaveProperty('solAmount');
      expect(response.body).toHaveProperty('platformFee');
    });
  });

  describe('Pool Information', () => {
    let poolAddress: string;

    beforeAll(async () => {
      // Create a test pool
      const createTokenDto = {
        name: 'Info Test Token',
        symbol: 'ITT',
        initialPrice: 0.000001,
        initialLiquidity: 10,
        creator: testWallet.publicKey.toBase58(),
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/tokens/create')
        .send(createTokenDto);

      poolAddress = response.body.poolAddress;
    });

    it('GET /api/v1/pool/:address - should get pool info', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/pool/${poolAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('poolAddress', poolAddress);
      expect(response.body).toHaveProperty('tokenAddress');
      expect(response.body).toHaveProperty('currentPrice');
      expect(response.body).toHaveProperty('liquidity');
      expect(response.body).toHaveProperty('volume24h');
    });

    it('GET /api/v1/pool/:address/stats - should get pool stats', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/pool/${poolAddress}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('totalTrades');
      expect(response.body).toHaveProperty('totalVolume');
      expect(response.body).toHaveProperty('platformFeesCollected');
      expect(response.body).toHaveProperty('launchFeeCollected');
    });
  });

  describe('Trending Tokens', () => {
    it('GET /api/v1/tokens/trending - should get trending tokens', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tokens/trending?limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.tokens)).toBe(true);
    });

    it('GET /api/v1/tokens/new - should get new tokens', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tokens/new?limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.tokens)).toBe(true);
    });
  });
});
