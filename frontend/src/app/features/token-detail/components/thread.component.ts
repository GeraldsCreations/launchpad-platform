import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Message {
  id: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: string;
  emoji?: string;
}

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="thread-container">
      <!-- Live indicator -->
      <div class="live-indicator" *ngIf="isLive">
        <span class="live-dot"></span>
        <span>Live</span>
      </div>

      <!-- Messages -->
      <div class="messages-container" #messagesContainer>
        <div 
          class="message" 
          *ngFor="let msg of messages">
          <div class="avatar" [style.background]="msg.avatar">
            {{ msg.emoji || getInitial(msg.username) }}
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="username">{{ msg.username }}</span>
              <span class="timestamp">{{ formatTimestamp(msg.timestamp) }}</span>
            </div>
            <div class="message-text">{{ msg.message }}</div>
          </div>
        </div>

        <!-- Empty state -->
        <div class="empty-state" *ngIf="messages.length === 0">
          <div class="empty-icon">💬</div>
          <p>No messages yet</p>
          <small>Be the first to comment!</small>
        </div>
      </div>

      <!-- Input box -->
      <div class="message-input-container">
        <input 
          type="text" 
          class="message-input"
          placeholder="Type a message..."
          [(ngModel)]="messageText"
          (keydown.enter)="sendMessage()"
          [disabled]="!canSendMessages">
        <button 
          class="send-button"
          (click)="sendMessage()"
          [disabled]="!messageText.trim() || !canSendMessages">
          <i class="pi pi-send"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .thread-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 400px;
      max-height: 600px;
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #ef4444;
      margin-bottom: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #ef4444;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      animation: blink 1.5s ease-in-out infinite;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 12px 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .messages-container::-webkit-scrollbar-track {
      background: var(--bg-primary);
    }

    .messages-container::-webkit-scrollbar-thumb {
      background: var(--border-default);
      border-radius: 3px;
    }

    .message {
      display: flex;
      gap: 12px;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
      font-weight: 600;
      color: white;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .username {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 14px;
    }

    .timestamp {
      font-size: 11px;
      color: var(--text-muted);
    }

    .message-text {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.5;
      word-wrap: break-word;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: var(--text-muted);
      padding: 40px 20px;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-state p {
      font-size: 16px;
      font-weight: 500;
      margin: 0 0 4px 0;
    }

    .empty-state small {
      font-size: 12px;
    }

    .message-input-container {
      display: flex;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--border-default);
      margin-top: auto;
    }

    .message-input {
      flex: 1;
      background: var(--bg-primary);
      border: 1px solid var(--border-default);
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text-primary);
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .message-input:focus {
      outline: none;
      border-color: var(--accent-purple);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .message-input::placeholder {
      color: var(--text-muted);
    }

    .send-button {
      background: var(--gradient-purple);
      color: white;
      border: none;
      border-radius: 8px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .send-button:hover:not(:disabled) {
      background: var(--gradient-purple-hover);
      transform: scale(1.05);
    }

    .send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class ThreadComponent implements OnInit {
  @Input() tokenAddress: string = '';
  @Input() canSendMessages: boolean = false;
  @Input() isLive: boolean = false;

  messages: Message[] = [];
  messageText: string = '';

  // Mock avatar colors
  private avatarColors = [
    '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', 
    '#3b82f6', '#ec4899', '#14b8a6', '#f97316'
  ];

  ngOnInit(): void {
    // Load mock messages
    this.loadMockMessages();
  }

  private loadMockMessages(): void {
    this.messages = [
      {
        id: '1',
        username: 'mairiosulersay8',
        avatar: this.avatarColors[0],
        message: '❤️',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        emoji: '❤️'
      },
      {
        id: '2',
        username: 'Elievnerrewartrrn',
        avatar: this.avatarColors[1],
        message: '😁😁😁',
        timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
        emoji: '😁'
      },
      {
        id: '3',
        username: 'nartyxadoit',
        avatar: this.avatarColors[2],
        message: '😁😁😁',
        timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
        emoji: '😁'
      },
      {
        id: '4',
        username: 'Gomaessimpel',
        avatar: this.avatarColors[3],
        message: '😁',
        timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
        emoji: '😁'
      },
      {
        id: '5',
        username: 'Suma_notita',
        avatar: this.avatarColors[4],
        message: '👍',
        timestamp: new Date(Date.now() - 1 * 60000).toISOString(),
        emoji: '👍'
      }
    ];
  }

  getInitial(username: string): string {
    return username.charAt(0).toUpperCase();
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.canSendMessages) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      username: 'You',
      avatar: this.avatarColors[5],
      message: this.messageText,
      timestamp: new Date().toISOString()
    };

    this.messages.push(newMessage);
    this.messageText = '';

    // Auto-scroll to bottom
    setTimeout(() => {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
