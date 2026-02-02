import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { User } from '../../database/entities/user.entity';

@ApiTags('admin')
@Controller('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('users/:wallet/api-key')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create API key for user' })
  @ApiResponse({ status: 201, description: 'API key created' })
  async createApiKey(
    @Param('wallet') wallet: string,
    @Body('tier') tier?: string,
  ): Promise<{ apiKey: string }> {
    const apiKey = await this.adminService.createApiKey(wallet, tier);
    return { apiKey };
  }

  @Delete('users/:wallet/api-key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiResponse({ status: 204, description: 'API key revoked' })
  async revokeApiKey(@Param('wallet') wallet: string): Promise<void> {
    await this.adminService.revokeApiKey(wallet);
  }

  @Post('users/:wallet/tier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user tier' })
  @ApiResponse({ status: 200, description: 'Tier updated' })
  async updateTier(
    @Param('wallet') wallet: string,
    @Body('tier') tier: string,
  ): Promise<{ success: boolean }> {
    await this.adminService.updateUserTier(wallet, tier);
    return { success: true };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getAllUsers(): Promise<User[]> {
    return this.adminService.getAllUsers();
  }

  @Get('system/status')
  @ApiOperation({ summary: 'Get system status' })
  @ApiResponse({ status: 200, description: 'System status' })
  async getSystemStatus(): Promise<any> {
    return this.adminService.getSystemStatus();
  }

  @Post('indexer/restart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart blockchain indexer' })
  @ApiResponse({ status: 200, description: 'Indexer restarted' })
  async restartIndexer(): Promise<{ success: boolean }> {
    await this.adminService.restartIndexer();
    return { success: true };
  }
}
