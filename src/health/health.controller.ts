/**
 * Controlador para verificación del estado del sistema.
 * Proporciona endpoints para monitorear el estado de:
 * - Conexiones a bases de datos
 * - Estado general del servicio
 * - Información de tiempo de actividad
 * 
 * @controller HealthController
 * @version 1.0.0
 */
import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  /**
   * Verifica el estado general del sistema.
   * 
   * @returns {Object} Estado del sistema incluyendo conexiones de base de datos
   * @memberof HealthController
   */
  @Get()
  @ApiOperation({ 
    summary: 'Verificar estado del sistema',
    description: 'Endpoint para verificar el estado de salud del sistema, incluyendo conexiones de base de datos'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado del sistema obtenido exitosamente',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-06-05T18:30:00.000Z',
        databases: {
          users: 'connected',
          admin: 'connected'
        }
      }
    }
  })
  async checkHealth() {
    this.logger.log('🔍 Verificando estado del sistema...');
    
    const usersDbStatus = await this.healthService.checkUsersDatabase();
    const adminDbStatus = await this.healthService.checkAdminDatabase();

    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      databases: {
        users: usersDbStatus ? 'connected' : 'disconnected',
        admin: adminDbStatus ? 'connected' : 'disconnected',
      },
    };

    this.logger.log(`✅ Estado del sistema: ${JSON.stringify(healthStatus.databases)}`);
    return healthStatus;
  }
} 