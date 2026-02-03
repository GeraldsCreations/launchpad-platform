import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  token: string;
  expiresIn: number;
  walletAddress: string;
}

interface NonceResponse {
  nonce: string;
  message: string;
}

interface VerifyResponse {
  valid: boolean;
  walletAddress: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  
  // Angular signals for reactive state
  private tokenSignal = signal<string | null>(null);
  private walletSignal = signal<string | null>(null);

  // Public readonly signals
  public readonly token = this.tokenSignal.asReadonly();
  public readonly wallet = this.walletSignal.asReadonly();
  public readonly isAuthenticated = computed(() => 
    !!this.tokenSignal() && !!this.walletSignal()
  );

  private apiUrl = environment.apiUrl || 'http://localhost:3000/v1';

  constructor() {
    // Check for existing token on init
    const token = this.getStoredToken();
    if (token) {
      this.tokenSignal.set(token);
      this.verifyToken(token);
    }
  }

  /**
   * Get nonce from backend
   */
  private getNonce(walletAddress: string): Promise<NonceResponse> {
    return this.http
      .post<NonceResponse>(`${this.apiUrl}/auth/nonce`, { walletAddress })
      .toPromise() as Promise<NonceResponse>;
  }

  /**
   * Login with wallet signature
   */
  async login(walletAdapter: any): Promise<void> {
    try {
      if (!walletAdapter || !walletAdapter.publicKey) {
        throw new Error('Wallet not connected');
      }

      const walletAddress = walletAdapter.publicKey.toString();

      // 1. Get nonce from backend
      const nonceData = await this.getNonce(walletAddress);

      // 2. Request signature from wallet
      const message = nonceData.message;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await walletAdapter.signMessage(encodedMessage);

      // 3. Send to backend for verification
      const response = await this.http
        .post<LoginResponse>(`${this.apiUrl}/auth/login`, {
          walletAddress,
          signature: Buffer.from(signature).toString('base64'),
          message,
        })
        .toPromise() as LoginResponse;

      // 4. Store token
      this.storeToken(response.token);
      this.tokenSignal.set(response.token);
      this.walletSignal.set(walletAddress);

      console.log('✅ Authenticated successfully');
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  logout(): void {
    this.clearToken();
    this.tokenSignal.set(null);
    this.walletSignal.set(null);
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.tokenSignal() || this.getStoredToken();
  }

  /**
   * Verify token with backend
   */
  private async verifyToken(token: string): Promise<void> {
    try {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      const response = await this.http
        .post<VerifyResponse>(`${this.apiUrl}/auth/verify`, {}, { headers })
        .toPromise() as VerifyResponse;

      if (response.valid) {
        this.walletSignal.set(response.walletAddress);
      } else {
        this.logout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      this.logout();
    }
  }

  /**
   * Store token in localStorage
   */
  private storeToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  /**
   * Get stored token from localStorage
   */
  private getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Clear token from localStorage
   */
  private clearToken(): void {
    localStorage.removeItem('auth_token');
  }

  /**
   * Get authorization header for HTTP requests
   */
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (token) {
      return new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });
    }
    return new HttpHeaders();
  }
}
