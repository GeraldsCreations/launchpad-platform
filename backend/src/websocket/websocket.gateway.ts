import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface SubscriptionMessage {
  action: 'subscribe' | 'unsubscribe';
  channel: 'token' | 'new_tokens' | 'trending' | 'trades';
  token_address?: string;
}

interface PriceUpdateEvent {
  event: 'price_update';
  token_address: string;
  price: number;
  market_cap: number;
  volume_24h: number;
  timestamp: number;
}

interface TokenCreatedEvent {
  event: 'token_created';
  token_address: string;
  name: string;
  symbol: string;
  creator: string;
  creator_type: string;
  timestamp: number;
}

interface TradeEvent {
  event: 'trade';
  token_address: string;
  side: 'buy' | 'sell';
  amount_sol: number;
  amount_tokens: string;
  trader: string;
  price: number;
  timestamp: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  path: '/v1/ws',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private subscriptions: Map<string, Set<string>> = new Map(); // channel -> Set of socket IDs

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up subscriptions
    this.subscriptions.forEach((subscribers, channel) => {
      subscribers.delete(client.id);
    });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: SubscriptionMessage,
    @ConnectedSocket() client: Socket,
  ): void {
    const channelKey = data.token_address 
      ? `${data.channel}:${data.token_address}`
      : data.channel;

    if (!this.subscriptions.has(channelKey)) {
      this.subscriptions.set(channelKey, new Set());
    }

    this.subscriptions.get(channelKey)!.add(client.id);
    this.logger.debug(`Client ${client.id} subscribed to ${channelKey}`);

    client.emit('subscribed', {
      channel: data.channel,
      token_address: data.token_address,
      message: 'Successfully subscribed',
    });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: SubscriptionMessage,
    @ConnectedSocket() client: Socket,
  ): void {
    const channelKey = data.token_address
      ? `${data.channel}:${data.token_address}`
      : data.channel;

    const subscribers = this.subscriptions.get(channelKey);
    if (subscribers) {
      subscribers.delete(client.id);
      this.logger.debug(`Client ${client.id} unsubscribed from ${channelKey}`);
    }

    client.emit('unsubscribed', {
      channel: data.channel,
      token_address: data.token_address,
      message: 'Successfully unsubscribed',
    });
  }

  /**
   * Emit price update to subscribed clients
   */
  emitPriceUpdate(tokenAddress: string, price: number, marketCap: number, volume24h: number): void {
    const event: PriceUpdateEvent = {
      event: 'price_update',
      token_address: tokenAddress,
      price,
      market_cap: marketCap,
      volume_24h: volume24h,
      timestamp: Date.now(),
    };

    // Emit to specific token channel
    const tokenChannel = `token:${tokenAddress}`;
    this.emitToChannel(tokenChannel, event);

    // Also emit to trending channel
    this.emitToChannel('trending', event);
  }

  /**
   * Emit new token created event
   */
  emitTokenCreated(
    tokenAddress: string,
    name: string,
    symbol: string,
    creator: string,
    creatorType: string,
  ): void {
    const event: TokenCreatedEvent = {
      event: 'token_created',
      token_address: tokenAddress,
      name,
      symbol,
      creator,
      creator_type: creatorType,
      timestamp: Date.now(),
    };

    this.emitToChannel('new_tokens', event);
  }

  /**
   * Emit trade event
   */
  emitTrade(
    tokenAddress: string,
    side: 'buy' | 'sell',
    amountSol: number,
    amountTokens: string,
    trader: string,
    price: number,
  ): void {
    const event: TradeEvent = {
      event: 'trade',
      token_address: tokenAddress,
      side,
      amount_sol: amountSol,
      amount_tokens: amountTokens,
      trader,
      price,
      timestamp: Date.now(),
    };

    // Emit to specific token channel
    const tokenChannel = `token:${tokenAddress}`;
    this.emitToChannel(tokenChannel, event);

    // Also emit to trades channel
    this.emitToChannel('trades', event);
  }

  /**
   * Emit event to all subscribers of a channel
   */
  private emitToChannel(channel: string, data: any): void {
    const subscribers = this.subscriptions.get(channel);
    
    if (subscribers && subscribers.size > 0) {
      subscribers.forEach((socketId) => {
        this.server.to(socketId).emit('message', data);
      });

      this.logger.debug(`Emitted ${data.event} to ${subscribers.size} clients on ${channel}`);
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): { totalConnections: number; subscriptions: number } {
    const totalConnections = this.server.sockets.sockets.size;
    let totalSubscriptions = 0;
    
    this.subscriptions.forEach((subscribers) => {
      totalSubscriptions += subscribers.size;
    });

    return {
      totalConnections,
      subscriptions: totalSubscriptions,
    };
  }
}
