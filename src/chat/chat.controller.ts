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
      // Datos de prueba temporales mientras se configura la base de datos
      const mockSessions = [
        {
          id: '1',
          phoneNumber: '584241234567',
          clientName: 'Cliente de Prueba 1',
          clientId: 'CLI001',
          status: 'active',
          chatbotName: 'Chatbot Principal',
          organizationName: 'Organización Test',
          lastMessage: 'Hola, necesito ayuda',
          lastMessageAt: new Date().toISOString(),
          messageCount: 5,
          searchCount: 2,
          createdAt: new Date().toISOString(),
          duration: '2 horas'
        },
        {
          id: '2',
          phoneNumber: '584161234567',
          clientName: 'Cliente de Prueba 2',
          clientId: 'CLI002',
          status: 'active',
          chatbotName: 'Chatbot Secundario',
          organizationName: 'Organización Test',
          lastMessage: '¿Tienen productos disponibles?',
          lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
          messageCount: 3,
          searchCount: 1,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          duration: '1 hora'
        }
      ];

      return {
        data: mockSessions,
        meta: {
          total: mockSessions.length,
          page: parseInt(page.toString()),
          limit: parseInt(limit.toString()),
          totalPages: 1
        }
      };
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