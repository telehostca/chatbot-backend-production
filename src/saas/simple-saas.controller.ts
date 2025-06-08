import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('SaaS Básico')
@Controller('saas')
export class SimpleSaasController {

  @Get('test')
  @ApiOperation({ summary: 'Probar conexión del sistema SaaS' })
  @ApiResponse({ status: 200, description: 'El sistema SaaS responde correctamente' })
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
  @ApiOperation({ summary: 'Ver estado actual del sistema' })
  @ApiResponse({ status: 200, description: 'Devuelve detalles operativos del sistema SaaS' })
  async status() {
    return {
      system: 'ZEMOGbot Chatbot SaaS',
      status: 'operational',
      environment: process.env.NODE_ENV || 'development',
      database: {
        type: 'PostgreSQL',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || 'chatbot_backend'
      },
      features: [
        'Gestión de usuarios',
        'Planes de suscripción',
        'Procesamiento de pagos',
        'Analítica de uso',
        'Integración con WhatsApp',
        'Soporte con IA'
      ],
      timestamp: new Date().toISOString()
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Verificar estado del servidor' })
  @ApiResponse({ status: 200, description: 'Estado de salud del sistema' })
  async health() {
    const memoryUsage = process.memoryUsage();
    return {
      status: 'healthy',
      uptime_seconds: process.uptime(),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      },
      timestamp: new Date().toISOString()
    };
  }
}
