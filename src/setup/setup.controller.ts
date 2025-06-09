import { Controller, Post, Get, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('api/setup')
export class SetupController {
  private readonly logger = new Logger(SetupController.name);

  constructor(
    @InjectDataSource('users') private dataSource: DataSource
  ) {}

  @Post('create-chat-messages-table')
  async createChatMessagesTable() {
    try {
      this.logger.log('🔄 Creando tabla chat_messages...');
      
      // Verificar si la tabla ya existe
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
      
      // Crear la tabla
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
      
      // Crear índices
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

  @Get('database-status')
  async getDatabaseStatus() {
    try {
      // Verificar qué tablas existen
      const tables = await this.dataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('persistent_sessions', 'chat_messages', 'chatbot_instances')
        ORDER BY table_name;
      `);
      
      const tableNames = tables.map(t => t.table_name);
      
      // Contar registros en persistent_sessions
      let sessionCount = 0;
      try {
        const sessionResult = await this.dataSource.query('SELECT COUNT(*) as count FROM persistent_sessions');
        sessionCount = parseInt(sessionResult[0].count);
      } catch (e) {
        // Ignorar error si no existe la tabla
      }
      
      // Contar registros en chat_messages (si existe)
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
} 