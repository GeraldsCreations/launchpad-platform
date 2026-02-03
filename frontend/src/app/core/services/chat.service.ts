import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id: string;
  walletAddress: string;
  tokenAddress: string | null;
  message: string;
  createdAt: Date;
  isBot: boolean;
  replyToId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private socket: Socket | null = null;
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private typingUsersSubject = new BehaviorSubject<Set<string>>(new Set());
  private onlineCountSubject = new BehaviorSubject<number>(0);
  private connectedSubject = new BehaviorSubject<boolean>(false);

  public messages$ = this.messagesSubject.asObservable();
  public typingUsers$ = this.typingUsersSubject.asObservable();
  public onlineCount$ = this.onlineCountSubject.asObservable();
  public connected$ = this.connectedSubject.asObservable();

  private currentRoom: string | null = null;
  private apiUrl = environment.apiUrl || 'http://localhost:3000/v1';
  private chatWsUrl = environment.chatWsUrl || 'http://localhost:3000/chat';

  /**
   * Connect to chat WebSocket
   */
  connect(): void {
    const token = this.authService.getToken();
    
    if (!token) {
      console.warn('Cannot connect to chat: not authenticated');
      return;
    }

    if (this.socket && this.socket.connected) {
      console.log('Chat already connected');
      return;
    }

    this.socket = io(this.chatWsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Chat connected');
      this.connectedSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Chat disconnected');
      this.connectedSubject.next(false);
    });

    this.socket.on('error', (error: any) => {
      console.error('Chat error:', error);
    });

    this.socket.on('roomHistory', (messages: ChatMessage[]) => {
      this.messagesSubject.next(messages);
    });

    this.socket.on('newMessage', (message: ChatMessage) => {
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, message]);
    });

    this.socket.on('userTyping', (data: { walletAddress: string; isTyping: boolean }) => {
      const typingUsers = this.typingUsersSubject.value;
      if (data.isTyping) {
        typingUsers.add(data.walletAddress);
      } else {
        typingUsers.delete(data.walletAddress);
      }
      this.typingUsersSubject.next(new Set(typingUsers));
    });

    this.socket.on('userJoined', (data: { walletAddress: string }) => {
      this.incrementOnlineCount();
    });

    this.socket.on('userLeft', (data: { walletAddress: string }) => {
      this.decrementOnlineCount();
    });
  }

  /**
   * Disconnect from chat
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectedSubject.next(false);
    }
  }

  /**
   * Join a chat room
   */
  joinRoom(tokenAddress?: string): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot join room: not connected');
      return;
    }

    this.currentRoom = tokenAddress || 'global';
    this.socket.emit('joinRoom', { tokenAddress });
  }

  /**
   * Leave current room
   */
  leaveRoom(): void {
    if (!this.socket || !this.currentRoom) {
      return;
    }

    this.socket.emit('leaveRoom', { tokenAddress: this.currentRoom === 'global' ? undefined : this.currentRoom });
    this.currentRoom = null;
    this.messagesSubject.next([]);
  }

  /**
   * Send a message
   */
  sendMessage(message: string, replyToId?: string): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot send message: not connected');
      return;
    }

    const tokenAddress = this.currentRoom === 'global' ? undefined : this.currentRoom;
    
    this.socket.emit('sendMessage', {
      tokenAddress,
      message,
      replyToId,
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(isTyping: boolean): void {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    const tokenAddress = this.currentRoom === 'global' ? undefined : this.currentRoom;
    
    this.socket.emit('typing', {
      tokenAddress,
      isTyping,
    });
  }

  /**
   * Get messages via REST API
   */
  async getMessages(tokenAddress?: string, limit: number = 50, before?: string): Promise<ChatMessage[]> {
    const headers = this.authService.getAuthHeaders();
    const params: any = { limit };
    
    if (tokenAddress) {
      params.tokenAddress = tokenAddress;
    }
    
    if (before) {
      params.before = before;
    }

    return this.http
      .get<ChatMessage[]>(`${this.apiUrl}/chat/messages`, { headers, params })
      .toPromise() as Promise<ChatMessage[]>;
  }

  /**
   * Send message via REST API (for bots)
   */
  async sendMessageApi(message: string, tokenAddress?: string): Promise<ChatMessage> {
    const headers = this.authService.getAuthHeaders();
    
    return this.http
      .post<ChatMessage>(`${this.apiUrl}/chat/messages`, { message, tokenAddress }, { headers })
      .toPromise() as Promise<ChatMessage>;
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string): Promise<void> {
    const headers = this.authService.getAuthHeaders();
    
    await this.http
      .delete(`${this.apiUrl}/chat/messages/${messageId}`, { headers })
      .toPromise();
  }

  /**
   * Get room info
   */
  async getRoomInfo(tokenAddress: string): Promise<any> {
    const headers = this.authService.getAuthHeaders();
    
    return this.http
      .get(`${this.apiUrl}/chat/rooms/${tokenAddress}`, { headers })
      .toPromise();
  }

  /**
   * Truncate wallet address for display
   */
  truncateWallet(address: string): string {
    if (!address || address.length < 8) {
      return address;
    }
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  /**
   * Increment online count
   */
  private incrementOnlineCount(): void {
    this.onlineCountSubject.next(this.onlineCountSubject.value + 1);
  }

  /**
   * Decrement online count
   */
  private decrementOnlineCount(): void {
    const count = this.onlineCountSubject.value;
    if (count > 0) {
      this.onlineCountSubject.next(count - 1);
    }
  }
}
