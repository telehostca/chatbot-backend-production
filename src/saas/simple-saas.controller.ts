import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('saas-simple')
@Controller('saas')
export class SimpleSaasController {
  
  @Get('test')
  @ApiOperation({ summary: 'Test del sistema SaaS' })
  @ApiResponse({ status: 200, description: 'Sistema SaaS funcionando correctamente' })
  async test() {
    return {
      status: 'success',
      message: '🚀 Sistema SaaS con PostgreSQL funcionando correctamente',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL',
      version: '2.0.0'
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Estado del sistema SaaS' })
  @ApiResponse({ status: 200, description: 'Estado del sistema' })
  async status() {
    return {
      system: 'Chatbot SaaS',
      status: 'operational',
      database: {
        type: 'PostgreSQL',
        host: 'localhost',
        port: 5432,
        database: 'chatbot_backend'
      },
      features: [
        'User Management',
        'Subscription Plans',
        'Payment Processing',
        'Usage Analytics',
        'WhatsApp Integration',
        'AI Chat Support'
      ],
      timestamp: new Date().toISOString()
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check del sistema' })
  @ApiResponse({ status: 200, description: 'Health check' })
  async health() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
} 