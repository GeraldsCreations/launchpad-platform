import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import { v4 as uuidv4 } from 'uuid';

export interface JwtPayload {
  walletAddress: string;
  sub: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private nonces: Map<string, { nonce: string; timestamp: number }> = new Map();
  private readonly NONCE_EXPIRATION = 5 * 60 * 1000; // 5 minutes

  constructor(private jwtService: JwtService) {
    // Clean up expired nonces every minute
    setInterval(() => this.cleanExpiredNonces(), 60 * 1000);
  }

  /**
   * Generate a nonce for wallet signature
   */
  generateNonce(): string {
    const nonce = uuidv4();
    return nonce;
  }

  /**
   * Store nonce temporarily
   */
  storeNonce(walletAddress: string, nonce: string): void {
    this.nonces.set(walletAddress, {
      nonce,
      timestamp: Date.now(),
    });
  }

  /**
   * Verify nonce is valid and not expired
   */
  private verifyNonce(walletAddress: string, expectedNonce: string): boolean {
    const stored = this.nonces.get(walletAddress);
    
    if (!stored) {
      return false;
    }

    // Check expiration
    if (Date.now() - stored.timestamp > this.NONCE_EXPIRATION) {
      this.nonces.delete(walletAddress);
      return false;
    }

    // Check nonce matches
    if (stored.nonce !== expectedNonce) {
      return false;
    }

    // Delete used nonce
    this.nonces.delete(walletAddress);
    return true;
  }

  /**
   * Verify Solana wallet signature
   */
  verifySignature(
    message: string,
    signature: string,
    walletAddress: string,
  ): boolean {
    try {
      // Convert message to Uint8Array
      const messageBytes = new TextEncoder().encode(message);
      
      // Decode signature from base64
      const signatureBytes = Buffer.from(signature, 'base64');
      
      // Get public key bytes
      const publicKey = new PublicKey(walletAddress);
      const publicKeyBytes = publicKey.toBytes();

      // Verify signature
      const verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes,
      );

      return verified;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Extract nonce from message
   */
  private extractNonceFromMessage(message: string): string | null {
    const match = message.match(/Nonce:\s*([a-f0-9-]+)/i);
    return match ? match[1] : null;
  }

  /**
   * Login with wallet signature
   */
  async login(
    walletAddress: string,
    signature: string,
    message: string,
  ): Promise<{ token: string; expiresIn: number }> {
    // Extract nonce from message
    const nonce = this.extractNonceFromMessage(message);
    
    if (!nonce) {
      throw new UnauthorizedException('Invalid message format');
    }

    // Verify nonce
    if (!this.verifyNonce(walletAddress, nonce)) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }

    // Verify signature
    const isValid = this.verifySignature(message, signature, walletAddress);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Generate JWT
    const payload: JwtPayload = {
      walletAddress,
      sub: walletAddress, // Use wallet address as user ID
    };

    const token = this.jwtService.sign(payload);
    
    return {
      token,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Clean up expired nonces
   */
  private cleanExpiredNonces(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.nonces.forEach((value, key) => {
      if (now - value.timestamp > this.NONCE_EXPIRATION) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.nonces.delete(key));
  }
}
