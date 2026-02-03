import { Controller, Post, Logger } from '@nestjs/common';
import { DbcService } from '../services/dbc.service';

@Controller('admin/dbc')
export class AdminDbcController {
  private readonly logger = new Logger(AdminDbcController.name);

  constructor(private readonly dbcService: DbcService) {}

  /**
   * Create new platform config with updated fees
   * POST /admin/dbc/create-config-with-fees
   */
  @Post('create-config-with-fees')
  async createConfigWithFees() {
    try {
      this.logger.log('Creating new platform config with 1% bonding fees...');
      
      const result = await this.dbcService.createAndSubmitPartnerConfig({
        name: 'LaunchPad Platform',
        website: 'https://launchpad.gereld.com',
        logo: 'https://launchpad.gereld.com/logo.png',
        migrationThreshold: 10, // 10 SOL
        poolCreationFee: 0.05,
        tradingFeeBps: 100, // 1% trading fee during bonding
        creatorFeeBps: 0,
      });

      this.logger.log(`✅ Config created: ${result.configKey.toBase58()}`);

      return {
        success: true,
        configKey: result.configKey.toBase58(),
        message: 'Config created with 1% bonding curve fees. Update DBC_PLATFORM_CONFIG_KEY in .env and restart.',
      };
    } catch (error) {
      this.logger.error('Failed to create config:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
