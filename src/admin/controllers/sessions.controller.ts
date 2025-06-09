import { Controller, Get, Post, Query, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SessionsService } from '../services/sessions.service';

@ApiTags('Sessions Management')
@Controller('admin/sessions')
// @UseGuards(JwtAuthGuard) // Temporalmente deshabilitado para desarrollo
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener sesiones de chat con paginación y filtros' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, description: 'Elementos por página' })
  @ApiQuery({ name: 'chatbotId', required: false, description: 'Filtrar por chatbot' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre, teléfono o ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sesiones obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              phoneNumber: { type: 'string' },
              clientName: { type: 'string' },
              clientId: { type: 'string' },
              status: { type: 'string' },
              chatbotName: { type: 'string' },
              organizationName: { type: 'string' },
              lastMessage: { type: 'string' },
              lastMessageAt: { type: 'string' },
              messageCount: { type: 'number' },
              searchCount: { type: 'number' },
              createdAt: { type: 'string' },
              duration: { type: 'string' },
              isAuthenticated: { type: 'boolean' }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' }
          }
        }
      }
    }
  })
  async getSessions(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('chatbotId') chatbotId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    return await this.sessionsService.getSessions({
      page: Number(page),
      limit: Number(limit),
      chatbotId,
      search,
      status
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de sesiones' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalSessions: { type: 'number' },
        activeSessions: { type: 'number' },
        authenticatedSessions: { type: 'number' },
        todaySessions: { type: 'number' },
        totalMessages: { type: 'number' },
        averageMessagesPerSession: { type: 'number' }
      }
    }
  })
  async getSessionStats() {
    return await this.sessionsService.getSessionStats();
  }

  @Get(':sessionId/messages')
  @ApiOperation({ summary: 'Obtener mensajes de una sesión específica' })
  @ApiResponse({ 
    status: 200, 
    description: 'Mensajes obtenidos exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              sender: { type: 'string' },
              timestamp: { type: 'string' },
              createdAt: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async getSessionMessages(@Param('sessionId') sessionId: string) {
    try {
      const messages = await this.sessionsService.getSessionMessages(sessionId);
      return { data: messages };
    } catch (error) {
      return {
        error: 'Error obteniendo mensajes',
        details: error.message
      };
    }
  }

  @Post(':sessionId/send')
  @ApiOperation({ summary: 'Enviar mensaje a una sesión específica' })
  @ApiResponse({ 
    status: 200, 
    description: 'Mensaje enviado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            messageId: { type: 'string' },
            timestamp: { type: 'string' },
            status: { type: 'string' }
          }
        }
      }
    }
  })
  async sendMessageToSession(
    @Param('sessionId') sessionId: string,
    @Body() messageDto: { message: string }
  ) {
    try {
      const result = await this.sessionsService.sendMessageToSession(sessionId, messageDto.message);
      return { 
        success: true, 
        data: result 
      };
    } catch (error) {
      return {
        error: 'Error enviando mensaje',
        details: error.message
      };
    }
  }
} 