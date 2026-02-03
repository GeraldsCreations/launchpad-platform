import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';

export interface SolPriceData {
  price: number;
  lastUpdated: number;
  source: string;
}

@Injectable({
  providedIn: 'root'
})
export class SolPriceService {
  private baseUrl = environment.apiUrl;
  private wsUrl = environment.wsUrl || this.baseUrl.replace('/v1', '');
  
  // BehaviorSubject to store current SOL price (reactive)
  private solPriceSubject = new BehaviorSubject<number>(150); // Default $150
  public solPrice$ = this.solPriceSubject.asObservable();

  private socket: Socket | null = null;
  private connected = false;

  constructor(private http: HttpClient) {
    // Fetch initial price
    this.fetchSolPrice();

    // Connect to WebSocket for real-time updates
    this.connectWebSocket();
  }

  /**
   * Get current SOL price as Observable (reactive)
   */
  getSolPriceObservable(): Observable<number> {
    return this.solPrice$;
  }

  /**
   * Get current SOL price (synchronous)
   */
  getCurrentPrice(): number {
    return this.solPriceSubject.value;
  }

  /**
   * Fetch SOL price from backend API
   */
  private fetchSolPrice(): void {
    this.http.get<{
      success: boolean;
      data: SolPriceData;
      cacheTimeRemaining: number;
    }>(`${this.baseUrl}/sol-price`)
      .pipe(
        tap(response => {
          this.solPriceSubject.next(response.data.price);
          console.log(`SOL price fetched: $${response.data.price.toFixed(2)}`);
        }),
        catchError(error => {
          console.error('Failed to fetch SOL price:', error);
          // Keep current price on error
          return [];
        })
      )
      .subscribe();
  }

  /**
   * Connect to WebSocket for real-time SOL price updates
   */
  private connectWebSocket(): void {
    try {
      this.socket = io(this.wsUrl, {
        path: '/v1/ws',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('✅ Connected to SOL price WebSocket');
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        console.warn('❌ Disconnected from SOL price WebSocket');
      });

      // Listen for SOL price updates (broadcast to all clients)
      this.socket.on('message', (data: any) => {
        if (data.event === 'sol_price_update') {
          const newPrice = data.price;
          const oldPrice = this.solPriceSubject.value;

          this.solPriceSubject.next(newPrice);

          const change = ((newPrice - oldPrice) / oldPrice) * 100;
          console.log(
            `💰 SOL price updated: $${newPrice.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%)`
          );
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('SOL price WebSocket connection error:', error);
      });

    } catch (error) {
      console.error('Failed to connect to SOL price WebSocket:', error);
    }
  }

  /**
   * Convert SOL to USD
   */
  solToUsd(solAmount: number): number {
    return solAmount * this.getCurrentPrice();
  }

  /**
   * Convert USD to SOL
   */
  usdToSol(usdAmount: number): number {
    const price = this.getCurrentPrice();
    return price > 0 ? usdAmount / price : 0;
  }

  /**
   * Format SOL amount with USD equivalent
   * Example: "5.00 SOL ($750.00)"
   */
  formatSolWithUsd(solAmount: number, decimals: number = 2): string {
    const usd = this.solToUsd(solAmount);
    return `${solAmount.toFixed(decimals)} SOL ($${usd.toFixed(2)})`;
  }

  /**
   * Clean up on service destroy
   */
  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
