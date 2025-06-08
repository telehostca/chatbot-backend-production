import { Controller, Post, Get, Delete, Body, Param, Query, UseInterceptors, UploadedFile, Logger, HttpCode } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { RAGService, RAGQuery, ProcessDocumentOptions } from '../services/rag.service';
import * as multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { EmbeddingService } from '../services/embedding.service';

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/rag';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

@ApiTags('RAG - Retrieval Augmented Generation')
@Controller('rag')
export class RAGController {
  private readonly logger = new Logger(RAGController.name);

  constructor(
    private readonly ragService: RAGService,
    private readonly embeddingService: EmbeddingService
  ) {}

  @Post('process-document')
  @ApiOperation({ 
    summary: 'Procesar documento y añadir a base de conocimiento',
    description: 'Procesa un documento de texto y lo añade a la base de conocimiento del chatbot especificado. El documento se divide en chunks y se generan embeddings para búsqueda semántica.'
  })
  @ApiBody({
    type: 'object',
    description: 'Opciones para procesar el documento',
    schema: {
      type: 'object',
      required: ['title', 'content', 'chatbotId'],
      properties: {
        title: {
          type: 'string',
          description: 'Título del documento',
          example: 'Manual de Usuario - Productos'
        },
        content: {
          type: 'string',
          description: 'Contenido completo del documento',
          example: 'Este es el manual de usuario que explica cómo usar nuestros productos...'
        },
        chatbotId: {
          type: 'string',
          description: 'ID del chatbot al que pertenece el documento',
          example: '123e4567-e89b-12d3-a456-426614174000'
        },
                 category: {
           type: 'string',
           description: 'Categoría del documento',
           example: 'manual'
         },
                 metadata: {
           type: 'object',
           description: 'Metadatos adicionales del documento',
           example: { author: 'Juan Pérez', version: '1.0' }
         }
      }
    },
    examples: {
      'manual-usuario': {
        summary: 'Manual de usuario',
        value: {
          title: 'Manual de Usuario - Productos',
          content: 'Este manual explica cómo usar nuestros productos. Incluye instrucciones paso a paso para la instalación, configuración y uso diario.',
          chatbotId: '123e4567-e89b-12d3-a456-426614174000',
          category: 'manual',
          metadata: {
            author: 'Equipo de Documentación',
            version: '2.1',
            lastUpdated: '2024-06-08'
          }
        }
      },
      'faq': {
        summary: 'Preguntas frecuentes',
        value: {
          title: 'FAQ - Preguntas Frecuentes',
          content: '¿Cómo puedo resetear mi contraseña? Para resetear tu contraseña, ve a la página de login y haz clic en "Olvidé mi contraseña".',
          chatbotId: '123e4567-e89b-12d3-a456-426614174000',
          category: 'faq'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Documento procesado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            knowledgeBaseId: { type: 'string', example: '456e7890-e89b-12d3-a456-426614174001' },
            title: { type: 'string', example: 'Manual de Usuario - Productos' },
            chunksCreated: { type: 'number', example: 15 },
            totalTokens: { type: 'number', example: 2500 },
            embeddingsGenerated: { type: 'number', example: 15 }
          }
        },
        message: { type: 'string', example: 'Documento procesado exitosamente' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos de entrada inválidos',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Error procesando documento: Título y contenido son requeridos' }
      }
    }
  })
  async processDocument(@Body() options: ProcessDocumentOptions) {
    try {
      this.logger.log(`Procesando documento: ${options.title} para chatbot: ${options.chatbotId}`);
      
      const result = await this.ragService.processDocument(options);
      
      return {
        success: true,
        data: result,
        message: 'Documento procesado exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error procesando documento: ${error.message}`);
      return {
        success: false,
        message: `Error procesando documento: ${error.message}`
      };
    }
  }

  @Post('upload-document/:chatbotId')
  @UseInterceptors(FileInterceptor('file', { storage }))
  @ApiOperation({ 
    summary: 'Subir y procesar archivo de documento',
    description: 'Sube un archivo (PDF, TXT, DOCX) y lo procesa automáticamente para añadirlo a la base de conocimiento del chatbot.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'chatbotId',
    description: 'ID del chatbot',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    description: 'Archivo a subir y procesar',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo a subir (PDF, TXT, DOCX)'
        },
        category: {
          type: 'string',
          description: 'Categoría del documento',
          example: 'manual'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Archivo subido y procesado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            filename: { type: 'string', example: 'manual-usuario.pdf' },
            knowledgeBaseId: { type: 'string', example: '456e7890-e89b-12d3-a456-426614174001' },
            chunksCreated: { type: 'number', example: 25 },
            fileSize: { type: 'number', example: 1024000 }
          }
        },
        message: { type: 'string', example: 'Archivo procesado exitosamente' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Archivo no válido o error en el procesamiento' 
  })
  async uploadDocument(
    @Param('chatbotId') chatbotId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category?: string
  ) {
    try {
      this.logger.log(`Subiendo archivo: ${file.originalname} para chatbot: ${chatbotId}`);
      
      // Leer contenido del archivo
      const content = fs.readFileSync(file.path, 'utf-8');
      
      // Procesar documento
      const result = await this.ragService.processDocument({
        chatbotId,
        title: file.originalname,
        content,
        documentType: this.getDocumentType(file.originalname),
        category,
        metadata: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        }
      });
      
      // Limpiar archivo temporal
      fs.unlinkSync(file.path);
      
      return {
        success: true,
        data: {
          filename: file.originalname,
          ...result
        },
        message: 'Archivo procesado exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error procesando archivo: ${error.message}`);
      return {
        success: false,
        message: `Error procesando archivo: ${error.message}`
      };
    }
  }

  @Post('query')
  @ApiOperation({ 
    summary: 'Realizar consulta RAG',
    description: 'Realiza una consulta semántica en la base de conocimiento del chatbot y retorna los fragmentos más relevantes junto con una respuesta generada por IA.'
  })
  @ApiBody({
    description: 'Consulta RAG',
    schema: {
      type: 'object',
      required: ['query', 'chatbotId'],
      properties: {
        query: {
          type: 'string',
          description: 'Pregunta o consulta a realizar',
          example: '¿Cómo puedo resetear mi contraseña?'
        },
        chatbotId: {
          type: 'string',
          description: 'ID del chatbot',
          example: '123e4567-e89b-12d3-a456-426614174000'
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados a retornar',
          example: 5,
          default: 5
        },
        threshold: {
          type: 'number',
          description: 'Umbral de similitud mínimo (0-1)',
          example: 0.7,
          default: 0.7
        }
      }
    },
    examples: {
      'consulta-basica': {
        summary: 'Consulta básica',
        value: {
          query: '¿Cómo puedo resetear mi contraseña?',
          chatbotId: '123e4567-e89b-12d3-a456-426614174000'
        }
      },
      'consulta-avanzada': {
        summary: 'Consulta con parámetros personalizados',
        value: {
          query: '¿Cuáles son los pasos para instalar el producto?',
          chatbotId: '123e4567-e89b-12d3-a456-426614174000',
          limit: 3,
          threshold: 0.8
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Consulta RAG ejecutada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            answer: { 
              type: 'string', 
              example: 'Para resetear tu contraseña, ve a la página de login y haz clic en "Olvidé mi contraseña". Luego ingresa tu email y recibirás un enlace para crear una nueva contraseña.' 
            },
            sources: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '789e0123-e89b-12d3-a456-426614174002' },
                  content: { type: 'string', example: 'Para resetear tu contraseña, ve a la página de login...' },
                  similarity: { type: 'number', example: 0.92 },
                  source: { type: 'string', example: 'FAQ - Preguntas Frecuentes' },
                  metadata: { 
                    type: 'object', 
                    example: { category: 'faq', section: 'autenticacion' } 
                  }
                }
              }
            },
            totalSources: { type: 'number', example: 3 },
            processingTime: { type: 'number', example: 1.25 }
          }
        },
        message: { type: 'string', example: 'Consulta ejecutada exitosamente' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Consulta inválida o chatbot no encontrado' 
  })
  async query(@Body() ragQuery: RAGQuery) {
    try {
      this.logger.log(`Consulta RAG para chatbot: ${ragQuery.chatbotId}`);
      
      const result = await this.ragService.query(ragQuery);
      
      return {
        success: true,
        data: result,
        message: 'Consulta ejecutada exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error en consulta RAG: ${error.message}`);
      return {
        success: false,
        message: `Error en consulta RAG: ${error.message}`
      };
    }
  }

  @Get('knowledge-bases/:chatbotId')
  @ApiOperation({ 
    summary: 'Obtener bases de conocimiento de un chatbot',
    description: 'Retorna todas las bases de conocimiento (documentos procesados) asociadas a un chatbot específico.'
  })
  @ApiParam({
    name: 'chatbotId',
    description: 'ID del chatbot',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Bases de conocimiento obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '456e7890-e89b-12d3-a456-426614174001' },
              title: { type: 'string', example: 'Manual de Usuario - Productos' },
              category: { type: 'string', example: 'manual' },
              chunksCount: { type: 'number', example: 15 },
              totalTokens: { type: 'number', example: 2500 },
              createdAt: { type: 'string', format: 'date-time', example: '2024-06-08T10:30:00.000Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2024-06-08T10:30:00.000Z' },
              metadata: { 
                type: 'object', 
                example: { author: 'Juan Pérez', version: '1.0' } 
              }
            }
          }
        },
        message: { type: 'string', example: 'Bases de conocimiento obtenidas exitosamente' }
      }
    }
  })
  async getKnowledgeBases(@Param('chatbotId') chatbotId: string) {
    try {
      const knowledgeBases = await this.ragService.listKnowledgeBases(chatbotId);
      
      return {
        success: true,
        data: knowledgeBases,
        message: 'Bases de conocimiento obtenidas exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error obteniendo bases de conocimiento: ${error.message}`);
      return {
        success: false,
        message: `Error obteniendo bases de conocimiento: ${error.message}`
      };
    }
  }

  @Get('stats/:chatbotId')
  @ApiOperation({ 
    summary: 'Obtener estadísticas RAG del chatbot',
    description: 'Retorna estadísticas detalladas sobre el uso de RAG para un chatbot específico.'
  })
  @ApiParam({
    name: 'chatbotId',
    description: 'ID del chatbot',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalDocuments: { type: 'number', example: 25 },
            totalChunks: { type: 'number', example: 350 },
            totalQueries: { type: 'number', example: 1250 },
            averageResponseTime: { type: 'number', example: 1.35 },
            topCategories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string', example: 'faq' },
                  count: { type: 'number', example: 15 }
                }
              }
            },
            recentQueries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  query: { type: 'string', example: '¿Cómo resetear contraseña?' },
                  timestamp: { type: 'string', format: 'date-time', example: '2024-06-08T10:30:00.000Z' },
                  responseTime: { type: 'number', example: 1.2 }
                }
              }
            }
          }
        },
        message: { type: 'string', example: 'Estadísticas obtenidas exitosamente' }
      }
    }
  })
  async getStats(@Param('chatbotId') chatbotId: string) {
    try {
      const stats = await this.ragService.getKnowledgeBaseStats(chatbotId);
      
      return {
        success: true,
        data: stats,
        message: 'Estadísticas obtenidas exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas: ${error.message}`);
      return {
        success: false,
        message: `Error obteniendo estadísticas: ${error.message}`
      };
    }
  }

  @Delete('knowledge-base/:knowledgeBaseId')
  @ApiOperation({ 
    summary: 'Eliminar base de conocimiento',
    description: 'Elimina permanentemente una base de conocimiento y todos sus chunks asociados.'
  })
  @ApiParam({
    name: 'knowledgeBaseId',
    description: 'ID de la base de conocimiento a eliminar',
    example: '456e7890-e89b-12d3-a456-426614174001'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Base de conocimiento eliminada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Base de conocimiento eliminada exitosamente' },
        deletedId: { type: 'string', example: '456e7890-e89b-12d3-a456-426614174001' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Base de conocimiento no encontrada' 
  })
  async deleteKnowledgeBase(@Param('knowledgeBaseId') knowledgeBaseId: string) {
    try {
      await this.ragService.deleteKnowledgeBase(knowledgeBaseId);
      
      return {
        success: true,
        message: 'Base de conocimiento eliminada exitosamente',
        deletedId: knowledgeBaseId
      };
    } catch (error) {
      this.logger.error(`Error eliminando base de conocimiento: ${error.message}`);
      return {
        success: false,
        message: `Error eliminando base de conocimiento: ${error.message}`
      };
    }
  }

  @Post('process-url')
  @ApiOperation({ 
    summary: 'Procesar contenido desde URL',
    description: 'Extrae y procesa contenido desde una URL web para añadirlo a la base de conocimiento.'
  })
  @ApiBody({
    description: 'URL y configuración para procesar',
    schema: {
      type: 'object',
      required: ['url', 'chatbotId'],
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'URL del contenido a procesar',
          example: 'https://ejemplo.com/documentacion'
        },
        chatbotId: {
          type: 'string',
          description: 'ID del chatbot',
          example: '123e4567-e89b-12d3-a456-426614174000'
        },
        title: {
          type: 'string',
          description: 'Título personalizado para el documento',
          example: 'Documentación Web'
        },
        category: {
          type: 'string',
          description: 'Categoría del documento',
          example: 'web-content'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'URL procesada exitosamente' 
  })
  async processUrl(@Body() data: { url: string; chatbotId: string; title?: string; category?: string }) {
    try {
      this.logger.log(`Procesando URL: ${data.url} para chatbot: ${data.chatbotId}`);
      
      // Extraer contenido de la URL (implementación básica)
      const response = await fetch(data.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const content = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      const result = await this.ragService.processDocument({
        chatbotId: data.chatbotId,
        title: data.title || `Contenido de ${data.url}`,
        content,
        documentType: 'url',
        category: data.category,
        sourceUrl: data.url
      });
      
      return {
        success: true,
        data: result,
        message: 'URL procesada exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error procesando URL: ${error.message}`);
      return {
        success: false,
        message: `Error procesando URL: ${error.message}`
      };
    }
  }

  @Post('test-embeddings')
  @ApiOperation({ 
    summary: 'Probar generación de embeddings',
    description: 'Endpoint de prueba para verificar que el servicio de embeddings funciona correctamente.'
  })
  @ApiBody({
    description: 'Texto para generar embeddings',
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: {
          type: 'string',
          description: 'Texto para generar embeddings',
          example: 'Este es un texto de prueba para generar embeddings'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Embeddings generados exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            text: { type: 'string', example: 'Este es un texto de prueba...' },
            embeddingLength: { type: 'number', example: 384 },
            processingTime: { type: 'number', example: 0.25 }
          }
        },
        message: { type: 'string', example: 'Embeddings generados exitosamente' }
      }
    }
  })
  async testEmbeddings(@Body() data: { text: string }) {
    try {
      const startTime = Date.now();
      const embeddings = await this.embeddingService.generateEmbedding(data.text);
      const processingTime = (Date.now() - startTime) / 1000;
      
      return {
        success: true,
        data: {
          text: data.text,
          embeddingLength: embeddings.length,
          processingTime
        },
        message: 'Embeddings generados exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error generando embeddings: ${error.message}`);
      return {
        success: false,
        message: `Error generando embeddings: ${error.message}`
      };
    }
  }

  @Get('debug-chunks/:chatbotId')
  @ApiOperation({ 
    summary: 'Debug: Ver chunks de un chatbot',
    description: 'Endpoint de debug para ver todos los chunks de texto almacenados para un chatbot.'
  })
  @ApiParam({
    name: 'chatbotId',
    description: 'ID del chatbot',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'limit',
    description: 'Número máximo de chunks a retornar',
    example: 10,
    required: false
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Chunks obtenidos exitosamente' 
  })
  async debugChunks(
    @Param('chatbotId') chatbotId: string,
    @Query('limit') limit: string = '10'
  ) {
    try {
      const chunks = await this.ragService.debugChunks(chatbotId);
      
      return {
        success: true,
        data: chunks,
        message: 'Chunks obtenidos exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error obteniendo chunks: ${error.message}`);
      return {
        success: false,
        message: `Error obteniendo chunks: ${error.message}`
      };
    }
  }

  @Post('simple-query')
  @ApiOperation({ 
    summary: 'Consulta RAG simplificada y robusta',
    description: 'Versión simplificada de la consulta RAG con manejo robusto de errores y respuestas más directas.'
  })
  @ApiBody({
    description: 'Consulta simple',
    schema: {
      type: 'object',
      required: ['query', 'chatbotId'],
      properties: {
        query: {
          type: 'string',
          description: 'Pregunta a realizar',
          example: '¿Cuál es el horario de atención?'
        },
        chatbotId: {
          type: 'string',
          description: 'ID del chatbot',
          example: '123e4567-e89b-12d3-a456-426614174000'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Consulta simple ejecutada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            answer: { type: 'string', example: 'Nuestro horario de atención es de lunes a viernes de 9:00 AM a 6:00 PM.' },
            confidence: { type: 'number', example: 0.95 },
            sourcesFound: { type: 'number', example: 2 }
          }
        },
        message: { type: 'string', example: 'Consulta simple ejecutada exitosamente' }
      }
    }
  })
  async simpleQuery(@Body() data: { query: string; chatbotId: string }) {
    try {
      this.logger.log(`Consulta simple RAG para chatbot: ${data.chatbotId}`);
      
      const result = await this.ragService.simpleQuery(data.query, data.chatbotId);
      
      return {
        success: true,
        data: result,
        message: 'Consulta simple ejecutada exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error en consulta simple RAG: ${error.message}`);
      return {
        success: false,
        message: `Error en consulta simple RAG: ${error.message}`
      };
    }
  }

  /**
   * Determina el tipo de documento basado en la extensión del archivo
   */
  private getDocumentType(filename: string): string {
    const extension = path.extname(filename).toLowerCase();
    
    switch (extension) {
      case '.pdf': return 'pdf';
      case '.doc': return 'doc';
      case '.docx': return 'docx';
      case '.txt': return 'txt';
      case '.md': return 'md';
      case '.html': return 'html';
      case '.json': return 'txt';
      default: return 'txt';
    }
  }
} 