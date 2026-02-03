import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';

interface JoinRoomDto {
  tokenAddress?: string;
}

interface SendMessageDto {
  tokenAddress?: string;
  message: string;
  replyToId?: string;
}

interface TypingDto {
  tokenAddress?: string;
  isTyping: boolean;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join a chat room
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: JoinRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = data.tokenAddress || 'global';
      client.join(room);
      
      this.logger.debug(`Client ${client.id} joined room ${room}`);

      // Load recent messages
      const messages = await this.chatService.getMessages(data.tokenAddress, 50);
      
      client.emit('roomHistory', messages);
      
      // Notify room of new user
      this.server.to(room).emit('userJoined', {
        walletAddress: client.handshake.auth.walletAddress,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  /**
   * Leave a chat room
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: JoinRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const room = data.tokenAddress || 'global';
    client.leave(room);
    
    this.logger.debug(`Client ${client.id} left room ${room}`);
    
    // Notify room of user leaving
    this.server.to(room).emit('userLeft', {
      walletAddress: client.handshake.auth.walletAddress,
      timestamp: Date.now(),
    });
  }

  /**
   * Send a message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const walletAddress = client.handshake.auth.walletAddress;
      
      if (!walletAddress) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Save message
      const chatMessage = await this.chatService.createMessage({
        walletAddress,
        tokenAddress: data.tokenAddress,
        message: data.message,
        replyToId: data.replyToId,
        isBot: false,
      });

      // Broadcast to room
      const room = data.tokenAddress || 'global';
      this.server.to(room).emit('newMessage', chatMessage);
      
      this.logger.debug(`Message sent to room ${room} by ${walletAddress}`);
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Handle typing indicator
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: TypingDto,
    @ConnectedSocket() client: Socket,
  ) {
    const walletAddress = client.handshake.auth.walletAddress;
    const room = data.tokenAddress || 'global';
    
    // Broadcast typing status to others in room (not sender)
    client.to(room).emit('userTyping', {
      walletAddress,
      isTyping: data.isTyping,
    });
  }

  /**
   * Broadcast new message from API (for bots)
   */
  broadcastMessage(tokenAddress: string | undefined, message: any) {
    const room = tokenAddress || 'global';
    this.server.to(room).emit('newMessage', message);
  }

  /**
   * Get online user count for a room
   */
  async getRoomUserCount(tokenAddress?: string): Promise<number> {
    const room = tokenAddress || 'global';
    const sockets = await this.server.in(room).fetchSockets();
    return sockets.length;
  }
}
