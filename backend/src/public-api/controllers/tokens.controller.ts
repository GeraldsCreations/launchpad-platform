import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TokenService } from '../services/token.service';
import { CreateTokenDto } from '../dto/create-token.dto';
import { Token } from '../../database/entities/token.entity';

@ApiTags('tokens')
@Controller('tokens')
@UseGuards(ThrottlerGuard)
export class TokensController {
  constructor(private readonly tokenService: TokenService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new token' })
  @ApiResponse({ status: 201, description: 'Token created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async createToken(@Body() createTokenDto: CreateTokenDto): Promise<Token> {
    return this.tokenService.createToken(createTokenDto);
  }

  // IMPORTANT: Specific routes must come BEFORE wildcard routes!
  
  @Get('trending')
  @ApiOperation({ summary: 'Get trending tokens' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of trending tokens' })
  async getTrending(@Query('limit') limit?: number): Promise<Token[]> {
    return this.tokenService.getTrendingTokens(limit || 10);
  }

  @Get('new')
  @ApiOperation({ summary: 'Get recently created tokens' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of new tokens' })
  async getNew(@Query('limit') limit?: number): Promise<Token[]> {
    return this.tokenService.getNewTokens(limit || 10);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search tokens by name or symbol' })
  @ApiQuery({ name: 'q', required: true, type: String, example: 'gereld' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<Token[]> {
    return this.tokenService.searchTokens(query, limit || 20);
  }

  @Get('filter/creator/:creator')
  @ApiOperation({ summary: 'Get tokens by creator address' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Tokens created by specified wallet' })
  async getByCreator(
    @Param('creator') creator: string,
    @Query('limit') limit?: number,
  ): Promise<Token[]> {
    return this.tokenService.getTokensByCreator(creator, limit || 20);
  }

  @Get('filter/graduated')
  @ApiOperation({ summary: 'Get graduated tokens' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of graduated tokens' })
  async getGraduated(@Query('limit') limit?: number): Promise<Token[]> {
    return this.tokenService.getGraduatedTokens(limit || 10);
  }

  // Wildcard route MUST be last!
  @Get(':address')
  @ApiOperation({ summary: 'Get token details by address' })
  @ApiResponse({ status: 200, description: 'Token found' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async getToken(@Param('address') address: string): Promise<Token> {
    return this.tokenService.getToken(address);
  }
}
