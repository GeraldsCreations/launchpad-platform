import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { ChatMessage } from '../database/entities/chat-message.entity';
import { ChatBan } from '../database/entities/chat-ban.entity';
import { ChatRoom } from '../database/entities/chat-room.entity';

const MAX_MESSAGE_LENGTH = 500;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatBan)
    private banRepository: Repository<ChatBan>,
    @InjectRepository(ChatRoom)
    private roomRepository: Repository<ChatRoom>,
  ) {}

  /**
   * Check if user is banned
   */
  async isUserBanned(walletAddress: string, tokenAddress?: string): Promise<boolean> {
    const now = new Date();
    
    // Check global ban
    const globalBan = await this.banRepository.findOne({
      where: {
        walletAddress,
        tokenAddress: IsNull(),
        isActive: true,
        expiresAt: LessThan(now),
      },
    });

    if (globalBan) {
      return true;
    }

    // Check room-specific ban if tokenAddress provided
    if (tokenAddress) {
      const roomBan = await this.banRepository.findOne({
        where: {
          walletAddress,
          tokenAddress,
          isActive: true,
          expiresAt: LessThan(now),
        },
      });

      if (roomBan) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sanitize message content
   */
  private sanitizeMessage(message: string): string {
    // Remove any HTML tags
    let sanitized = message.replace(/<[^>]*>/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > MAX_MESSAGE_LENGTH) {
      sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
    }

    return sanitized;
  }

  /**
   * Create a new message
   */
  async createMessage(data: {
    walletAddress: string;
    tokenAddress?: string;
    message: string;
    replyToId?: string;
    isBot?: boolean;
  }): Promise<ChatMessage> {
    // Check if user is banned
    const isBanned = await this.isUserBanned(data.walletAddress, data.tokenAddress);
    
    if (isBanned) {
      throw new ForbiddenException('You are banned from this chat');
    }

    // Sanitize message
    const sanitizedMessage = this.sanitizeMessage(data.message);
    
    if (!sanitizedMessage || sanitizedMessage.length === 0) {
      throw new ForbiddenException('Message cannot be empty');
    }

    // Create message
    const message = this.messageRepository.create({
      walletAddress: data.walletAddress,
      tokenAddress: data.tokenAddress || null,
      message: sanitizedMessage,
      replyToId: data.replyToId || null,
      isBot: data.isBot || false,
    });

    await this.messageRepository.save(message);

    // Update room message count if token-specific
    if (data.tokenAddress) {
      await this.incrementRoomMessageCount(data.tokenAddress);
    }

    return message;
  }

  /**
   * Get messages for a room
   */
  async getMessages(
    tokenAddress: string | undefined,
    limit: number = 50,
    beforeId?: string,
  ): Promise<ChatMessage[]> {
    const query = this.messageRepository
      .createQueryBuilder('message')
      .where('message.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('message.createdAt', 'DESC')
      .take(Math.min(limit, 100)); // Max 100 messages

    // Filter by room
    if (tokenAddress) {
      query.andWhere('message.tokenAddress = :tokenAddress', { tokenAddress });
    } else {
      query.andWhere('message.tokenAddress IS NULL');
    }

    // Pagination
    if (beforeId) {
      const beforeMessage = await this.messageRepository.findOne({
        where: { id: beforeId },
      });
      
      if (beforeMessage) {
        query.andWhere('message.createdAt < :before', {
          before: beforeMessage.createdAt,
        });
      }
    }

    const messages = await query.getMany();
    
    // Return in chronological order
    return messages.reverse();
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, walletAddress: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only allow deletion of own messages
    if (message.walletAddress !== walletAddress) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Soft delete
    message.isDeleted = true;
    await this.messageRepository.save(message);
  }

  /**
   * Get or create chat room
   */
  async getOrCreateRoom(tokenAddress: string): Promise<ChatRoom> {
    let room = await this.roomRepository.findOne({
      where: { tokenAddress },
    });

    if (!room) {
      room = this.roomRepository.create({
        tokenAddress,
        messageCount: 0,
        isActive: true,
      });
      await this.roomRepository.save(room);
    }

    return room;
  }

  /**
   * Get room info
   */
  async getRoomInfo(tokenAddress: string): Promise<ChatRoom> {
    const room = await this.roomRepository.findOne({
      where: { tokenAddress },
    });

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    return room;
  }

  /**
   * Increment room message count
   */
  private async incrementRoomMessageCount(tokenAddress: string): Promise<void> {
    await this.roomRepository
      .createQueryBuilder()
      .update(ChatRoom)
      .set({ messageCount: () => 'messageCount + 1' })
      .where('tokenAddress = :tokenAddress', { tokenAddress })
      .execute();
  }

  /**
   * Ban user from chat
   */
  async banUser(
    walletAddress: string,
    reason: string,
    expiresAt: Date,
    tokenAddress?: string,
  ): Promise<ChatBan> {
    const ban = this.banRepository.create({
      walletAddress,
      tokenAddress: tokenAddress || null,
      reason,
      expiresAt,
      isActive: true,
    });

    return this.banRepository.save(ban);
  }

  /**
   * Remove ban
   */
  async removeBan(banId: string): Promise<void> {
    await this.banRepository.update(banId, { isActive: false });
  }
}
