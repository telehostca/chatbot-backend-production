import { Controller, Post, Body, Param, Get, Query, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    @InjectDataSource('users') private dataSource: DataSource
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
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('chatbotId') chatbotId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    return this.chatService.getSessions({
      page: parseInt(page.toString()) || 1,
      limit: parseInt(limit.toString()) || 10,
      chatbotId,
      search,
      status
    });
  }

  @Get('sessions/:sessionId/messages')
  async getSessionMessages(@Param('sessionId') sessionId: string) {
    try {
      const messages = await this.chatService.getSessionMessages(sessionId);
      return { data: messages };
    } catch (error) {
      this.logger.error(`Error obteniendo mensajes: ${error.message}`);
      return { data: [], error: error.message };
    }
  }

  @Post('sessions/:sessionId/send-message')
  async sendMessageToSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { message: string }
  ) {
    return this.chatService.sendMessageToSession(sessionId, body.message);
  }

  @Post('sessions/:sessionId/pause-bot')
  async pauseBot(@Param('sessionId') sessionId: string) {
    return this.chatService.pauseBotForSession(sessionId);
  }

  @Post('sessions/:sessionId/resume-bot')
  async resumeBot(@Param('sessionId') sessionId: string) {
    return this.chatService.resumeBotForSession(sessionId);
  }

  @Post('sessions/:sessionId/send-manual-message')
  async sendManualMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: { message: string; operatorName: string }
  ) {
    return this.chatService.sendManualMessage(sessionId, body.message, body.operatorName);
  }

  @Get('sessions/:sessionId/bot-status')
  async getBotStatus(@Param('sessionId') sessionId: string) {
    return this.chatService.getBotStatusForSession(sessionId);
  }

  @Post('setup/create-chat-messages-table')
  async createChatMessagesTable() {
    try {
      this.logger.log('🔄 Creando tabla chat_messages...');
      
      const tableExists = await this.dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'chat_messages'
        );
      `);
      
      if (tableExists[0].exists) {
        this.logger.log('✅ Tabla chat_messages ya existe');
        return { 
          success: true, 
          message: 'Tabla chat_messages ya existe',
          action: 'no_action_needed'
        };
      }
      
      await this.dataSource.query(`
        CREATE TABLE chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT NOT NULL,
          sender VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          chat_session_id UUID,
          session_id UUID,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await this.dataSource.query(`
        CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
      `);
      
      await this.dataSource.query(`
        CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
      `);
      
      this.logger.log('✅ Tabla chat_messages creada exitosamente');
      
      return { 
        success: true, 
        message: 'Tabla chat_messages creada exitosamente',
        action: 'table_created'
      };
      
    } catch (error) {
      this.logger.error(`❌ Error creando tabla: ${error.message}`);
      return { 
        success: false, 
        message: `Error: ${error.message}`,
        action: 'error'
      };
    }
  }

  @Get('setup/database-status')
  async getDatabaseStatus() {
    try {
      const tables = await this.dataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('persistent_sessions', 'chat_messages', 'chatbot_instances')
        ORDER BY table_name;
      `);
      
      const tableNames = tables.map(t => t.table_name);
      
      let sessionCount = 0;
      try {
        const sessionResult = await this.dataSource.query('SELECT COUNT(*) as count FROM persistent_sessions');
        sessionCount = parseInt(sessionResult[0].count);
      } catch (e) {
        // Ignorar error si no existe la tabla
      }
      
      let messageCount = 0;
      if (tableNames.includes('chat_messages')) {
        try {
          const messageResult = await this.dataSource.query('SELECT COUNT(*) as count FROM chat_messages');
          messageCount = parseInt(messageResult[0].count);
        } catch (e) {
          // Ignorar error
        }
      }
      
      return {
        tables: tableNames,
        counts: {
          sessions: sessionCount,
          messages: messageCount
        },
        status: tableNames.includes('chat_messages') ? 'complete' : 'missing_chat_messages'
      };
      
    } catch (error) {
      this.logger.error(`Error verificando estado: ${error.message}`);
      return { 
        error: error.message,
        status: 'error'
      };
    }
  }

  @Get('test-connection')
  async testConnection() {
    return {
      success: true,
      message: 'Chat API funcionando correctamente',
      timestamp: new Date(),
      endpoints: {
        pauseBot: 'POST /chat/sessions/{sessionId}/pause-bot',
        resumeBot: 'POST /chat/sessions/{sessionId}/resume-bot',
        sendMessage: 'POST /chat/sessions/{sessionId}/send-manual-message',
        botStatus: 'GET /chat/sessions/{sessionId}/bot-status'
      }
    };
  }

  @Post('test-all-functions/:sessionId')
  async testAllFunctions(@Param('sessionId') sessionId: string) {
    try {
      const results = [];

      // 1. Test obtener status del bot
      try {
        const statusResult = await this.chatService.getBotStatusForSession(sessionId);
        results.push({
          test: 'getBotStatus',
          status: 'success',
          data: statusResult
        });
      } catch (error) {
        results.push({
          test: 'getBotStatus',
          status: 'error',
          error: error.message
        });
      }

      // 2. Test pausar bot
      try {
        const pauseResult = await this.chatService.pauseBotForSession(sessionId);
        results.push({
          test: 'pauseBot',
          status: 'success',
          data: pauseResult
        });
      } catch (error) {
        results.push({
          test: 'pauseBot',
          status: 'error',
          error: error.message
        });
      }

      // 3. Test enviar mensaje manual
      try {
        const messageResult = await this.chatService.sendManualMessage(
          sessionId, 
          '🧪 Test completo de funcionalidades desde API - Todo funcionando correctamente!', 
          'Sistema Test'
        );
        results.push({
          test: 'sendManualMessage',
          status: 'success',
          data: messageResult
        });
      } catch (error) {
        results.push({
          test: 'sendManualMessage',
          status: 'error',
          error: error.message
        });
      }

      // 4. Test reanudar bot
      try {
        const resumeResult = await this.chatService.resumeBotForSession(sessionId);
        results.push({
          test: 'resumeBot',
          status: 'success',
          data: resumeResult
        });
      } catch (error) {
        results.push({
          test: 'resumeBot',
          status: 'error',
          error: error.message
        });
      }

      return {
        success: true,
        message: 'Test completo ejecutado',
        sessionId,
        timestamp: new Date(),
        results
      };

    } catch (error) {
      return {
        success: false,
        message: 'Error en test completo',
        error: error.message,
        sessionId,
        timestamp: new Date()
      };
    }
  }
} 