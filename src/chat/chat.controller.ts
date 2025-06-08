import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService
  ) {}

  @Post(':chatbotId/message')
  async sendMessage(
    @Param('chatbotId') chatbotId: string,
    @Body() messageDto: { message: string; from: string }
  ) {
    try {
      // Usar ChatService para todos los chatbots
      const response = await this.chatService.processMessage(
          messageDto.message,
          messageDto.from,
          chatbotId
        );
      
        return { response };
    } catch (error) {
      return { 
        error: 'Error procesando mensaje',
        details: error.message 
      };
    }
  }

  @Get('sessions')
  async getSessions(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('chatbotId') chatbotId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    try {
      const sessions = await this.chatService.getSessions({
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        chatbotId,
        search,
        status
      });
      
      return sessions;
    } catch (error) {
      return {
        error: 'Error obteniendo sesiones',
        details: error.message
      };
    }
  }

  @Get('sessions/:sessionId/messages')
  async getSessionMessages(@Param('sessionId') sessionId: string) {
    try {
      const messages = await this.chatService.getSessionMessages(sessionId);
      return { data: messages };
    } catch (error) {
      return {
        error: 'Error obteniendo mensajes',
        details: error.message
      };
    }
  }

  @Post('sessions/:sessionId/send')
  async sendMessageToSession(
    @Param('sessionId') sessionId: string,
    @Body() messageDto: { message: string }
  ) {
    try {
      const result = await this.chatService.sendMessageToSession(sessionId, messageDto.message);
      return { success: true, data: result };
    } catch (error) {
      return {
        error: 'Error enviando mensaje',
        details: error.message
      };
    }
  }
} 