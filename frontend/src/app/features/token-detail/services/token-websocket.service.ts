import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, throttleTime, filter } from 'rxjs';
import { WebSocketService, PriceUpdateEvent, TradeEvent } from '../../../core/services/websocket.service';

export interface TokenUpdate {
  price: number;
  marketCap: number;
  volume24h: number;
  holderCount?: number;
  priceChange24h?: number;
}

export interface NewTrade {
  id: string;
  trader: string;
  side: 'buy' | 'sell';
  amount_sol: number;
  amount_tokens: number;
  price: number;
  timestamp: number;
}

/**
 * Token-specific WebSocket service
 * Provides throttled, filtered updates for a single token
 */
@Injectable({
  providedIn: 'root'
})
export class TokenWebSocketService implements OnDestroy {
  private currentTokenAddress: string = '';
  private priceUpdateSubject = new Subject<TokenUpdate>();
  private tradeSubject = new Subject<NewTrade>();
  private statsUpdateSubject = new Subject<any>();
  private destroy$ = new Subject<void>();

  // Public observables with throttling for performance
  public priceUpdate$ = this.priceUpdateSubject.asObservable().pipe(
    throttleTime(100) // Max 10 updates per second
  );

  public newTrade$ = this.tradeSubject.asObservable();
  
  public statsUpdate$ = this.statsUpdateSubject.asObservable().pipe(
    throttleTime(1000) // Max 1 update per second for stats
  );

  constructor(private wsService: WebSocketService) {}

  /**
   * Subscribe to updates for a specific token
   */
  subscribeToToken(tokenAddress: string): void {
    if (this.currentTokenAddress === tokenAddress) {
      return; // Already subscribed
    }

    // Unsubscribe from previous token if any
    if (this.currentTokenAddress) {
      this.unsubscribeFromToken();
    }

    this.currentTokenAddress = tokenAddress;

    // Subscribe to token-specific WebSocket channel
    this.wsService.subscribeToToken(tokenAddress).subscribe({
      next: (event: PriceUpdateEvent | TradeEvent) => {
        this.handleWebSocketEvent(event);
      },
      error: (error) => {
        console.error('WebSocket error for token:', tokenAddress, error);
      }
    });

    console.log('✅ Subscribed to token updates:', tokenAddress);
  }

  /**
   * Unsubscribe from current token
   */
  unsubscribeFromToken(): void {
    if (this.currentTokenAddress) {
      this.wsService.unsubscribe('token', this.currentTokenAddress);
      this.currentTokenAddress = '';
      console.log('🔕 Unsubscribed from token updates');
    }
  }

  /**
   * Handle incoming WebSocket events
   */
  private handleWebSocketEvent(event: PriceUpdateEvent | TradeEvent): void {
    switch (event.event) {
      case 'price_update':
        this.handlePriceUpdate(event as PriceUpdateEvent);
        break;
      
      case 'trade':
        this.handleTrade(event as TradeEvent);
        break;
      
      default:
        console.log('Unknown event type:', event);
    }
  }

  /**
   * Handle price update events
   */
  private handlePriceUpdate(event: PriceUpdateEvent): void {
    const update: TokenUpdate = {
      price: event.price,
      marketCap: event.market_cap || event.marketCap, // Backend sends market_cap
      volume24h: event.volume_24h || event.volume24h, // Backend sends volume_24h
    };

    this.priceUpdateSubject.next(update);
  }

  /**
   * Handle trade events
   */
  private handleTrade(event: TradeEvent): void {
    const trade: NewTrade = {
      id: `${event.trader}-${event.timestamp}`,
      trader: event.trader,
      side: event.side,
      amount_sol: event.amount_sol,
      amount_tokens: parseFloat(event.amount_tokens),
      price: event.price,
      timestamp: event.timestamp,
    };

    this.tradeSubject.next(trade);

    // Also emit price update from trade
    const priceUpdate: TokenUpdate = {
      price: event.price,
      marketCap: 0, // Will be updated separately
      volume24h: 0,
    };
    this.priceUpdateSubject.next(priceUpdate);
  }

  /**
   * Check if connected to WebSocket
   */
  isConnected(): boolean {
    return this.wsService.isConnected();
  }

  /**
   * Get connection status as observable
   */
  getConnectionStatus(): Observable<boolean> {
    return new Observable(observer => {
      const interval = setInterval(() => {
        observer.next(this.isConnected());
      }, 1000);

      return () => clearInterval(interval);
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeFromToken();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
