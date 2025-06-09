import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StatsService } from '../services/stats.service';

@ApiTags('Statistics')
@Controller('admin/stats')
// @UseGuards(JwtAuthGuard) // Temporalmente deshabilitado para desarrollo
@ApiBearerAuth()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener estadísticas generales del sistema' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        chatbots: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            active: { type: 'number' },
            inactive: { type: 'number' }
          }
        },
        conversations: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            today: { type: 'number' },
            thisWeek: { type: 'number' },
            thisMonth: { type: 'number' }
          }
        },
        messages: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            today: { type: 'number' },
            thisWeek: { type: 'number' },
            thisMonth: { type: 'number' }
          }
        },
        notifications: {
          type: 'object',
          properties: {
            sent: { type: 'number' },
            pending: { type: 'number' },
            failed: { type: 'number' }
          }
        },
        rag: {
          type: 'object',
          properties: {
            documents: { type: 'number' },
            chunks: { type: 'number' },
            queries: { type: 'number' }
          }
        },
        database: {
          type: 'object',
          properties: {
            connections: { type: 'number' },
            active: { type: 'number' }
          }
        }
      }
    }
  })
  async getGeneralStats(@Query('period') period: string = 'today') {
    return await this.statsService.getGeneralStats(period);
  }

  @Get('chatbots')
  @ApiOperation({ summary: 'Obtener estadísticas de chatbots más activos' })
  @ApiResponse({ status: 200, description: 'Estadísticas de chatbots obtenidas' })
  async getChatbotStats() {
    return await this.statsService.getChatbotStats();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Obtener actividad por día de la semana' })
  @ApiResponse({ status: 200, description: 'Actividad semanal obtenida' })
  async getWeeklyActivity() {
    return await this.statsService.getWeeklyActivity();
  }

  @Get('events')
  @ApiOperation({ summary: 'Obtener eventos recientes del sistema' })
  @ApiResponse({ status: 200, description: 'Eventos recientes obtenidos' })
  async getRecentEvents(@Query('limit') limit: number = 10) {
    return await this.statsService.getRecentEvents(limit);
  }
} 