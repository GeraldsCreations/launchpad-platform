import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client = context.switchToWs().getClient();
      const token = client.handshake.auth.token;

      if (!token) {
        return false;
      }

      const secret = this.configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key-change-this';
      const payload = this.jwtService.verify(token, { secret });
      
      // Attach wallet address to client
      client.handshake.auth.walletAddress = payload.walletAddress;
      
      return true;
    } catch (error) {
      return false;
    }
  }
}
