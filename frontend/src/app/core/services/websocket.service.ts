import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface WebSocketMessage {
  event: string;
  data: any;
}

export interface PriceUpdateEvent {
  event: 'price_update';
  tokenAddress?: string;
  token_address?: string; // Support both formats
  price: number;
  marketCap?: number;
  market_cap?: number; // Support both formats
  volume24h?: number;
  volume_24h?: number; // Support both formats
  timestamp: number;
}

export interface TokenCreatedEvent {
  event: 'token_created';
  tokenAddress?: string;
  token_address?: string; // Support both formats
  name: string;
  symbol: string;
  creator: string;
  creatorType?: string;
  creator_type?: string; // Support both formats
  timestamp: number;
}

export interface TradeEvent {
  event: 'trade';
  tokenAddress?: string;
  token_address?: string; // Support both formats
  side: 'buy' | 'sell';
  amountSol?: number;
  amount_sol?: number; // Support both formats
  amountTokens?: string;
  amount_tokens?: string; // Support both formats
  trader: string;
  price: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private messageSubject = new Subject<any>();
  private connected = false;

  public messages$ = this.messageSubject.asObservable();

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (this.socket?.connected) {
      return;
    }

    // Socket.IO connection - backend serves at /v1/ws path
    this.socket = io(environment.apiUrl.replace('/v1', ''), {
      path: '/v1/ws',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', this.socket?.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
    });

    // Listen for all message events
    this.socket.on('message', (data: any) => {
      console.log('📨 WebSocket message:', data);
      this.messageSubject.next(data);
    });

    // Listen for subscription confirmations
    this.socket.on('subscribed', (data: any) => {
      console.log('✅ Subscribed:', data);
    });

    this.socket.on('unsubscribed', (data: any) => {
      console.log('🔕 Unsubscribed:', data);
    });
  }

  subscribe(channel: string, token_address?: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, waiting...');
      setTimeout(() => this.subscribe(channel, token_address), 500);
      return;
    }

    const message: any = {
      action: 'subscribe',
      channel,
    };

    if (token_address) {
      message.token_address = token_address;
    }

    console.log('📤 Subscribing to:', message);
    this.socket.emit('subscribe', message);
  }

  unsubscribe(channel: string, token_address?: string): void {
    if (!this.socket?.connected) {
      return;
    }

    const message: any = {
      action: 'unsubscribe',
      channel,
    };

    if (token_address) {
      message.token_address = token_address;
    }

    console.log('📤 Unsubscribing from:', message);
    this.socket.emit('unsubscribe', message);
  }

  subscribeToToken(tokenAddress: string): Observable<PriceUpdateEvent | TradeEvent> {
    this.subscribe('token', tokenAddress);
    
    return new Observable(observer => {
      const subscription = this.messages$.subscribe((message: any) => {
        if (
          (message.event === 'price_update' || message.event === 'trade') &&
          message.token_address === tokenAddress
        ) {
          observer.next(message);
        }
      });

      return () => {
        subscription.unsubscribe();
        this.unsubscribe('token', tokenAddress);
      };
    });
  }

  subscribeToNewTokens(): Observable<TokenCreatedEvent> {
    this.subscribe('new_tokens');
    
    return new Observable(observer => {
      const subscription = this.messages$.subscribe((message: any) => {
        if (message.event === 'token_created') {
          observer.next(message);
        }
      });

      return () => {
        subscription.unsubscribe();
        this.unsubscribe('new_tokens');
      };
    });
  }

  subscribeToTrending(): Observable<PriceUpdateEvent> {
    this.subscribe('trending');
    
    return new Observable(observer => {
      const subscription = this.messages$.subscribe((message: any) => {
        if (message.event === 'price_update') {
          observer.next(message);
        }
      });

      return () => {
        subscription.unsubscribe();
        this.unsubscribe('trending');
      };
    });
  }

  subscribeToTrades(): Observable<TradeEvent> {
    this.subscribe('trades');
    
    return new Observable(observer => {
      const subscription = this.messages$.subscribe((message: any) => {
        if (message.event === 'trade') {
          observer.next(message);
        }
      });

      return () => {
        subscription.unsubscribe();
        this.unsubscribe('trades');
      };
    });
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}
