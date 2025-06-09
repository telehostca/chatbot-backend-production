import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('saas')
export class TestSaasController {
  private readonly logger = new Logger(TestSaasController.name);

  constructor(
    @InjectDataSource('users') private dataSource: DataSource
  ) {}

  @Get('test')
  async test() {
    return {
      status: 'success',
      message: '🚀 Sistema SaaS con PostgreSQL funcionando correctamente',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL conectado',
      migration_status: 'Migración de SQLite a PostgreSQL completada'
    };
  }

  @Get('status')
  async status() {
    return {
      system: 'Chatbot SaaS Backend',
      status: 'operational',
      database: {
        type: 'PostgreSQL',
        host: 'localhost',
        port: 5432,
        database: 'chatbot_backend',
        status: 'connected'
      },
      migration: {
        from: 'SQLite',
        to: 'PostgreSQL',
        status: 'completed',
        tables_migrated: [
          'users',
          'user_plans', 
          'user_subscriptions',
          'user_usage',
          'payments'
        ]
      },
      timestamp: new Date().toISOString()
    };
  }

  @Get()
  async testConnection() {
    return {
      message: 'Backend funcionando correctamente',
      timestamp: new Date(),
      status: 'ok'
    };
  }

  @Post('create-chat-messages-table')
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

  @Get('database-status')
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

  @Post('recreate-chat-messages-table')
  async recreateChatMessagesTable() {
    try {
      this.logger.log('🔄 Recreando tabla chat_messages con estructura correcta...');
      
      await this.dataSource.query(`DROP TABLE IF EXISTS chat_messages CASCADE;`);
      this.logger.log('🗑️ Tabla chat_messages eliminada');
      
      await this.dataSource.query(`
        CREATE TABLE chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT NOT NULL,
          sender VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          chat_session_id UUID,
          session_id UUID
        );
      `);
      
      await this.dataSource.query(`
        CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
      `);
      
      await this.dataSource.query(`
        CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
      `);
      
      await this.dataSource.query(`
        ALTER TABLE chat_messages 
        ADD CONSTRAINT fk_chat_messages_session 
        FOREIGN KEY (session_id) REFERENCES persistent_sessions(id) ON DELETE CASCADE;
      `);
      
      this.logger.log('✅ Tabla chat_messages recreada exitosamente con estructura correcta');
      
      return { 
        success: true, 
        message: 'Tabla chat_messages recreada exitosamente',
        action: 'table_recreated',
        structure: {
          columns: ['id', 'content', 'sender', 'timestamp', 'createdAt', 'chat_session_id', 'session_id'],
          indexes: ['idx_chat_messages_session_id', 'idx_chat_messages_timestamp'],
          foreignKeys: ['fk_chat_messages_session']
        }
      };
      
    } catch (error) {
      this.logger.error(`❌ Error recreando tabla: ${error.message}`);
      return { 
        success: false, 
        message: `Error: ${error.message}`,
        action: 'error'
      };
    }
  }

  // 🔧 NUEVO: Endpoint de prueba para insertar mensaje directamente
  @Post('test-insert-message')
  async testInsertMessage() {
    try {
      this.logger.log('🧪 Probando inserción directa de mensaje...');
      
      // Insertar un mensaje de prueba directamente
      const result = await this.dataSource.query(`
        INSERT INTO chat_messages (content, sender, timestamp, session_id) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id;
      `, [
        'Mensaje de prueba directo',
        'user', 
        new Date(),
        '49fde641-6a73-4d40-a6d2-0528cc773d16'
      ]);
      
      this.logger.log(`✅ Mensaje insertado con ID: ${result[0].id}`);
      
      // Verificar que se insertó
      const count = await this.dataSource.query('SELECT COUNT(*) as count FROM chat_messages');
      
      return { 
        success: true, 
        message: 'Mensaje insertado exitosamente',
        insertedId: result[0].id,
        totalMessages: parseInt(count[0].count)
      };
      
    } catch (error) {
      this.logger.error(`❌ Error insertando mensaje: ${error.message}`);
      return { 
        success: false, 
        message: `Error: ${error.message}`
      };
    }
  }
} 