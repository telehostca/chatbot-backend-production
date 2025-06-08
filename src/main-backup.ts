/**
 * Punto de entrada principal de la aplicación.
 * Este archivo configura:
 * - El servidor NestJS
 * - Middleware global
 * - Configuración de CORS
 * - Manejo de errores
 * - Documentación Swagger
 * - Servicio de frontend React
 * 
 * @file main.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { WinstonModule, utilities as winstonUtilities } from 'nest-winston';
import { format, transports } from 'winston';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

// Polyfill para crypto global (soluciona el error de SchedulerOrchestrator)
import * as crypto from 'crypto';
if (!(global as any).crypto) {
  (global as any).crypto = crypto;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // 🐘 Sistema SaaS - PostgreSQL configurado
  logger.log('🚀 Iniciando Sistema SaaS con PostgreSQL');
  logger.log(`📊 Modo: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔗 Base de datos: ${process.env.DB_HOST || 'postgresql'}:${process.env.DB_PORT || 5432}/${process.env.DB_DATABASE || 'telehost'}`);
  logger.log('✅ PostgreSQL configurado para sistema SaaS');

  // Crear directorio de logs si no existe
  const logDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Configurar Winston logger
  const winstonLogger = WinstonModule.createLogger({
    transports: [
      new transports.Console({
        format: format.combine(
          format.timestamp(),
          format.colorize(),
          format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`;
          })
        ),
      }),
      new transports.File({
        filename: path.join(logDir, 'saas-system.log'),
        format: format.combine(
          format.timestamp(),
          format.json(),
        ),
      }),
    ],
  });

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    {
      logger: winstonLogger,
    }
  );
  
  const configService = app.get(ConfigService);

  // Configurar carpeta para archivos estáticos
  const uploadDir = configService.get('UPLOAD_DIR', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads',
  });

  // Servir frontend React (si existe el build)
  const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(frontendDistPath)) {
    // Servir archivos estáticos del frontend
    app.useStaticAssets(frontendDistPath, {
      prefix: '/admin',
    });
    
    winstonLogger.log('✅ Frontend React servido desde /admin');
  } else {
    winstonLogger.warn('⚠️ Frontend React no encontrado. Ejecuta: npm run frontend:build');
  }

  // Servir archivos HTML estáticos desde el directorio raíz (para compatibilidad)
  app.useStaticAssets(path.join(__dirname, '..'), {
    index: false,
    dotfiles: 'ignore',
  });

  // Habilitar CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Habilitar validación global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Prefijo global para todas las rutas API
  app.setGlobalPrefix('api');

  // 🔧 CONFIGURAR CLIENT-SIDE ROUTING PARA REACT SPA
  // Esto DEBE ir después del prefijo global para no interferir con /api
  if (fs.existsSync(frontendDistPath)) {
    const expressApp = app.getHttpAdapter().getInstance();
    
    // Manejar todas las rutas del frontend React (SPA routing)
    expressApp.get('/admin/*', (req, res) => {
      // Solo para rutas que NO sean de API
      if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
      }
    });
    
    // También manejar la ruta base /admin
    expressApp.get('/admin', (req, res) => {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
    
    winstonLogger.log('🔧 Client-side routing configurado para React SPA');
  }

  // Configuración de Swagger para Sistema SaaS
  const config = new DocumentBuilder()
    .setTitle('🚀 Chatbot SaaS API')
    .setDescription('API completa para el sistema de Chatbot SaaS con PostgreSQL')
    .setVersion('2.0')
    .addTag('users', 'Gestión de usuarios del sistema SaaS')
    .addTag('plans', 'Planes de suscripción y pagos')
    .addTag('subscriptions', 'Gestión de suscripciones')
    .addTag('payments', 'Procesamiento de pagos')
    .addTag('analytics', 'Analíticas y estadísticas')
    .addTag('saas-diagnostics', 'Diagnósticos del sistema SaaS')
    .addTag('whatsapp', 'Integración con WhatsApp')
    .addTag('chat', 'Gestión de conversaciones')
    .addTag('admin', 'Administración del sistema')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: '🚀 Chatbot SaaS - API Documentation',
    customfavIcon: 'https://avatars.githubusercontent.com/u/6936373?s=200&v=4',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
    },
  });

  // Iniciar servidor
  const port = configService.get('PORT', 3000);
  await app.listen(port, '0.0.0.0');
  
  const baseUrl = configService.get('baseUrl');
  winstonLogger.log(`🎉 Sistema SaaS iniciado exitosamente en puerto ${port}`);
  winstonLogger.log(`📖 Documentación API: ${baseUrl || `http://localhost:${port}`}/api`);
  winstonLogger.log(`🏠 Frontend Admin: ${baseUrl || `http://localhost:${port}`}/admin`);
  winstonLogger.log(`🐘 PostgreSQL: Conectado y funcionando`);
}
bootstrap().catch(error => {
  console.error('❌ Error iniciando la aplicación:', error);
  process.exit(1);
});