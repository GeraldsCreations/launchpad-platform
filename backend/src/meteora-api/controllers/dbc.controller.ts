import { Controller, Post, Get, Body, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DbcService } from '../services/dbc.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeteoraPool } from '../entities/meteora-pool.entity';
import {
  CreateDbcTokenDto,
  CreateDbcTokenResponseDto,
  SubmitDbcTokenDto,
  CreatePartnerConfigDto,
} from '../dto/create-dbc-token.dto';
import { sendAndConfirmRawTransaction } from '@solana/web3.js';

@ApiTags('DBC (Dynamic Bonding Curve)')
@Controller('dbc')
export class DbcController {
  private readonly logger = new Logger(DbcController.name);

  constructor(
    private dbcService: DbcService,
    @InjectRepository(MeteoraPool)
    private poolRepository: Repository<MeteoraPool>,
  ) {}

  @Post('admin/create-config')
  @ApiOperation({
    summary: 'Create partner config (one-time setup)',
    description: 'Creates the LaunchPad partner config that defines bonding curve parameters for all tokens',
  })
  async createPartnerConfig(@Body() dto: CreatePartnerConfigDto) {
    try {
      this.logger.log('Creating partner config...');

      const result = await this.dbcService.createPartnerConfig({
        name: dto.name,
        website: dto.website,
        logo: dto.logo,
        migrationThreshold: dto.migrationThreshold,
        poolCreationFee: dto.poolCreationFee * 1e9, // Convert SOL to lamports
        tradingFeeBps: dto.tradingFeeBps,
        creatorFeeBps: dto.creatorFeeBps,
      });

      // TODO: Sign and submit transaction
      // For now, return unsigned transaction
      const serialized = result.transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      return {
        success: true,
        configKey: result.configKey.toBase58(),
        transaction: serialized.toString('base64'),
        message: 'Config created! Sign and submit this transaction to activate.',
      };
    } catch (error) {
      this.logger.error('Failed to create partner config:', error);
      throw new HttpException(
        `Partner config creation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('admin/set-config')
  @ApiOperation({ summary: 'Set platform config key (load from database)' })
  async setPlatformConfig(@Body() body: { configKey: string }) {
    try {
      this.dbcService.setPlatformConfigKey(body.configKey);
      
      return {
        success: true,
        message: 'Platform config set successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to set config: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('create')
  @ApiOperation({
    summary: 'Build unsigned token creation transaction (DBC)',
    description: 'Creates token + bonding curve pool in ONE transaction (pump.fun style)',
  })
  @ApiResponse({ status: 201, type: CreateDbcTokenResponseDto })
  async createToken(@Body() dto: CreateDbcTokenDto): Promise<CreateDbcTokenResponseDto> {
    try {
      this.logger.log(`Building DBC token creation for: ${dto.name} (${dto.symbol})`);
      this.logger.log(`Creator: ${dto.creator}`);
      this.logger.log(`First buy: ${dto.firstBuyAmount || 0} SOL`);

      const result = await this.dbcService.buildCreateTokenTransaction({
        name: dto.name,
        symbol: dto.symbol,
        description: dto.description,
        imageUrl: dto.imageUrl,
        creatorWallet: dto.creator,
        creatorBotId: dto.creatorBotId,
        firstBuyAmount: dto.firstBuyAmount,
      });

      return {
        transaction: result.transaction,
        poolAddress: result.poolAddress,
        tokenMint: result.tokenMint,
        message: `Sign this transaction to create ${dto.symbol} on the bonding curve!`,
      };
    } catch (error) {
      this.logger.error('Failed to build DBC token transaction:', error);
      throw new HttpException(
        `Token creation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit signed token creation transaction' })
  async submitToken(@Body() dto: SubmitDbcTokenDto) {
    try {
      this.logger.log(`Submitting DBC token creation for pool: ${dto.poolAddress}`);

      const connection = this.dbcService.getConnection();
      const transactionBuffer = Buffer.from(dto.signedTransaction, 'base64');

      this.logger.log('Broadcasting transaction to Solana network...');

      const signature = await sendAndConfirmRawTransaction(
        connection,
        transactionBuffer,
        {
          commitment: 'confirmed',
          maxRetries: 3,
        },
      );

      this.logger.log(`✅ Token + pool created! Signature: ${signature}`);

      // Save pool to database
      const pool = this.poolRepository.create({
        poolAddress: dto.poolAddress,
        tokenAddress: dto.tokenMint,
        baseTokenAddress: dto.tokenMint,
        tokenName: 'DBC Token', // TODO: Get from metadata
        tokenSymbol: 'DBC', // TODO: Get from metadata
        creator: dto.creator,
        creatorBotId: dto.creatorBotId,
        creatorBotWallet: dto.creator,
        creatorRevenueSharePercent: 50, // From config
        binStep: 0, // DBC doesn't use binStep
        activeId: 0,
        currentPrice: 0.000001, // Starting price
        volume24h: 0,
        liquidity: 0,
        tvl: 0,
        feeRate: 100, // From config (1%)
        platformFeesCollected: 0,
        launchFeeCollected: 0,
        isActive: true,
      });

      await this.poolRepository.save(pool);

      return {
        success: true,
        signature,
        poolAddress: dto.poolAddress,
        tokenMint: dto.tokenMint,
        message: 'Token launched on bonding curve! Users can now trade.',
        explorerUrl: `https://solscan.io/tx/${signature}?cluster=devnet`,
        tradingUrl: `https://jup.ag/swap/${dto.tokenMint}`, // Jupiter integration
      };
    } catch (error) {
      this.logger.error('Failed to submit DBC token transaction:', error);
      throw new HttpException(
        `Token submission failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('pool/:poolAddress')
  @ApiOperation({ summary: 'Get DBC pool info' })
  async getPoolInfo(@Param('poolAddress') poolAddress: string) {
    try {
      const poolInfo = await this.dbcService.getPoolInfo(poolAddress);
      
      return {
        success: true,
        pool: poolInfo,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get pool info: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Check DBC service status' })
  async getStatus() {
    return {
      success: true,
      service: 'DBC (Dynamic Bonding Curve)',
      version: '1.0.0',
      description: 'Pump.fun style token launches with auto-migration to DLMM',
      features: [
        'One-transaction token + pool creation',
        'Automatic price discovery via bonding curve',
        'Auto-migration to DLMM at 10 SOL threshold',
        'Anti-sniper protection',
        'Fee sharing (50/50 partner/creator)',
      ],
    };
  }
}
