import { Injectable } from '@angular/core';
import { Observable, Subject, interval } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WebSocketMessage {
  event: string;
  data: any;
}

export interface PriceUpdateEvent {
  event: 'price_update';
  token_address: string;
  price: number;
  market_cap: number;
  volume_24h: number;
}

export interface TokenCreatedEvent {
  event: 'token_created';
  token_address: string;
  name: string;
  symbol: string;
  creator: string;
}

export interface TradeEvent {
  event: 'trade';
  token_address: string;
  side: 'buy' | 'sell';
  amount_sol: number;
  amount_tokens: number;
  trader: string;
  price: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageSubject = new Subject<WebSocketMessage>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  public messages$ = this.messageSubject.asObservable();

  constructor() {
    // TODO: Install socket.io-client and migrate from native WebSocket to Socket.IO
    // Backend uses Socket.IO, not native WebSocket
    // For now, disable auto-connect to prevent console errors
    // this.connect();
  }

  private connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(environment.wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.messageSubject.next(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.reconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.reconnect();
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  subscribe(channel: string, params?: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        channel,
        ...params
      }));
    } else {
      console.warn('WebSocket not connected. Queuing subscription...');
      // Wait for connection and retry
      setTimeout(() => this.subscribe(channel, params), 1000);
    }
  }

  unsubscribe(channel: string, params?: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        channel,
        ...params
      }));
    }
  }

  subscribeToToken(tokenAddress: string): Observable<any> {
    this.subscribe('token', { token_address: tokenAddress });
    
    return new Observable(observer => {
      const subscription = this.messages$.subscribe(message => {
        if (
          (message.event === 'price_update' || message.event === 'trade') &&
          (message as any).token_address === tokenAddress
        ) {
          observer.next(message);
        }
      });

      return () => {
        subscription.unsubscribe();
        this.unsubscribe('token', { token_address: tokenAddress });
      };
    });
  }

  subscribeToNewTokens(): Observable<any> {
    this.subscribe('new_tokens');
    
    return new Observable(observer => {
      const subscription = this.messages$.subscribe(message => {
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

  subscribeToTrending(): Observable<any> {
    this.subscribe('trending');
    
    return new Observable(observer => {
      const subscription = this.messages$.subscribe(message => {
        if (message.event === 'trending_update') {
          observer.next(message);
        }
      });

      return () => {
        subscription.unsubscribe();
        this.unsubscribe('trending');
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
