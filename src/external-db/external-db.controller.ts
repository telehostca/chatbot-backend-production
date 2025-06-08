import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ExternalDbService } from './external-db.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('external-db')
export class ExternalDbController {
  constructor(private readonly externalDbService: ExternalDbService) {}

  /**
   * Verifica el estado de la conexión a la base de datos externa
   * @param chatbotId ID del chatbot
   * @returns Estado de la conexión
   */
  @Get('status/:chatbotId')
  async getConnectionStatus(@Param('chatbotId') chatbotId: string) {
    const hasConnection = this.externalDbService.hasConnection(chatbotId);
    const isInitialized = await this.externalDbService.isConnectionInitialized(chatbotId);
    
    return {
      chatbotId,
      connected: hasConnection && isInitialized,
      exists: hasConnection,
      initialized: isInitialized
    };
  }

  /**
   * Intenta reconectar a la base de datos externa
   * @param chatbotId ID del chatbot
   * @returns Resultado de la reconexión
   */
  @Post('reconnect/:chatbotId')
  async reconnectDatabase(@Param('chatbotId') chatbotId: string) {
    try {
      const connection = await this.externalDbService.reconnectIfNeeded(chatbotId);
      return {
        success: !!connection,
        message: connection ? 'Reconexión exitosa' : 'No se pudo reconectar'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ejecuta una consulta de prueba en la base de datos externa
   * @param chatbotId ID del chatbot
   * @param body Consulta a ejecutar
   * @returns Resultado de la consulta
   */
  @Post('test-query/:chatbotId')
  async testQuery(
    @Param('chatbotId') chatbotId: string,
    @Body() body: { query: string }
  ) {
    try {
      const result = await this.externalDbService.ejecutarQuery(
        body.query,
        [],
        chatbotId
      );
      return {
        success: true,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtiene las conexiones activas
   * @returns Lista de conexiones activas
   */
  @Get('active-connections')
  getActiveConnections() {
    return {
      connections: this.externalDbService.getActiveConnections()
    };
  }
} 