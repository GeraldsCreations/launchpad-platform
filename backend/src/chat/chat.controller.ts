import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatRateLimitGuard } from './guards/chat-rate-limit.guard';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  /**
   * Get messages for a chat room
   */
  @Get('messages')
  async getMessages(
    @Query('tokenAddress') tokenAddress?: string,
    @Query('limit') limit: number = 50,
    @Query('before') before?: string,
  ) {
    return this.chatService.getMessages(tokenAddress, limit, before);
  }

  /**
   * Send a message (REST API - for bots)
   */
  @Post('messages')
  @UseGuards(ChatRateLimitGuard)
  @Throttle({ default: { limit: 5, ttl: 1000 } }) // 5 messages per second
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Request() req,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.chatService.createMessage({
      walletAddress: req.user.walletAddress,
      tokenAddress: dto.tokenAddress,
      message: dto.message,
      replyToId: dto.replyToId,
      isBot: true, // Mark as bot message when sent via API
    });

    // Broadcast via WebSocket
    this.chatGateway.broadcastMessage(dto.tokenAddress, message);

    return message;
  }

  /**
   * Delete a message
   */
  @Delete('messages/:id')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(
    @Request() req,
    @Param('id') messageId: string,
  ) {
    await this.chatService.deleteMessage(messageId, req.user.walletAddress);
    
    return {
      success: true,
      message: 'Message deleted',
    };
  }

  /**
   * Get room info
   */
  @Get('rooms/:tokenAddress')
  async getRoomInfo(@Param('tokenAddress') tokenAddress: string) {
    const room = await this.chatService.getRoomInfo(tokenAddress);
    const onlineCount = await this.chatGateway.getRoomUserCount(tokenAddress);
    
    return {
      ...room,
      onlineCount,
    };
  }

  /**
   * Get global chat info
   */
  @Get('rooms/global/info')
  async getGlobalInfo() {
    const onlineCount = await this.chatGateway.getRoomUserCount();
    
    return {
      room: 'global',
      onlineCount,
    };
  }
}
