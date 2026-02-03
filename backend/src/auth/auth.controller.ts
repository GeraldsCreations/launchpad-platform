import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

class LoginDto {
  walletAddress: string;
  signature: string;
  message: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Generate a nonce for wallet signature
   */
  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  async getNonce(@Body('walletAddress') walletAddress: string) {
    const nonce = this.authService.generateNonce();
    
    // Store nonce temporarily
    this.authService.storeNonce(walletAddress, nonce);
    
    return {
      nonce,
      message: `Sign this message to authenticate with LaunchPad.\n\nNonce: ${nonce}`,
    };
  }

  /**
   * Login with wallet signature
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(
      loginDto.walletAddress,
      loginDto.signature,
      loginDto.message,
    );

    return {
      ...result,
      walletAddress: loginDto.walletAddress,
    };
  }

  /**
   * Verify JWT token
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verify(@Request() req) {
    return {
      valid: true,
      walletAddress: req.user.walletAddress,
    };
  }

  /**
   * Logout (client-side should delete token)
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout() {
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  /**
   * Get current user info
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    return {
      walletAddress: req.user.walletAddress,
    };
  }
}
