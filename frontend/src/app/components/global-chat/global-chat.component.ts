import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-global-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './global-chat.component.html',
  styleUrls: ['./global-chat.component.scss'],
})
export class GlobalChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  messages: ChatMessage[] = [];
  messageText = '';
  isMinimized = false;
  onlineCount = 0;
  typingUsers: string[] = [];

  // Use signals from AuthService
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentWallet = this.authService.wallet;

  private subscriptions: Subscription[] = [];
  private typingTimeout: any = null;
  private shouldScrollToBottom = false;

  constructor() {
    // React to authentication changes using effect
    effect(() => {
      const isAuth = this.isAuthenticated();
      console.log('🔐 Auth state changed:', isAuth);
      
      if (isAuth) {
        this.connectChat();
      } else {
        this.chatService.disconnect();
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to chat messages
    this.subscriptions.push(
      this.chatService.messages$.subscribe((messages) => {
        this.messages = messages;
        this.shouldScrollToBottom = true;
      })
    );

    // Subscribe to online count
    this.subscriptions.push(
      this.chatService.onlineCount$.subscribe((count) => {
        this.onlineCount = count;
      })
    );

    // Subscribe to typing users
    this.subscriptions.push(
      this.chatService.typingUsers$.subscribe((users) => {
        this.typingUsers = Array.from(users);
      })
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.chatService.disconnect();
  }

  /**
   * Connect to chat
   */
  private connectChat(): void {
    this.chatService.connect();
    
    // Wait a bit for connection, then join global room
    setTimeout(() => {
      this.chatService.joinRoom();
    }, 500);
  }

  /**
   * Send message
   */
  sendMessage(): void {
    if (!this.messageText.trim() || !this.isAuthenticated()) {
      return;
    }

    this.chatService.sendMessage(this.messageText.trim());
    this.messageText = '';
    
    // Stop typing indicator
    this.chatService.sendTyping(false);
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  /**
   * Handle typing
   */
  onTyping(): void {
    // Send typing indicator
    this.chatService.sendTyping(true);

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Stop typing after 2 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      this.chatService.sendTyping(false);
    }, 2000);
  }

  /**
   * Toggle minimize
   */
  toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
  }

  /**
   * Truncate wallet address
   */
  truncateWallet(address: string): string {
    return this.chatService.truncateWallet(address);
  }

  /**
   * Format timestamp
   */
  formatTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Check if message is from current user
   */
  isOwnMessage(message: ChatMessage): boolean {
    return message.walletAddress === this.currentWallet();
  }

  /**
   * Scroll to bottom of messages
   */
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }
}
