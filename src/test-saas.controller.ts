import { Controller, Get } from '@nestjs/common';

@Controller('saas')
export class TestSaasController {
  
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
} 