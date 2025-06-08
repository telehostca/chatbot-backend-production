import { Injectable, Logger } from '@nestjs/common';
import { RAGService, RAGQuery } from './rag.service';

export interface ChatRAGResponse {
  useRAG: boolean;
  ragAnswer?: string;
  ragSources?: any[];
  ragConfidence?: number;
  fallbackToAI: boolean;
  enhancedPrompt?: string;
}

@Injectable()
export class RAGIntegrationService {
  private readonly logger = new Logger(RAGIntegrationService.name);

  constructor(private readonly ragService: RAGService) {}

  /**
   * Procesa un mensaje de chat usando RAG si está disponible
   */
  async processMessageWithRAG(
    chatbotId: string, 
    userMessage: string,
    conversationContext?: string
  ): Promise<ChatRAGResponse> {
    try {
      // 1. Verificar si el chatbot tiene base de conocimiento
      const knowledgeBases = await this.ragService.listKnowledgeBases(chatbotId);
      const activeKnowledgeBases = knowledgeBases.filter(kb => kb.isActive && kb.status === 'processed');

      if (activeKnowledgeBases.length === 0) {
        return {
          useRAG: false,
          fallbackToAI: true
        };
      }

      // 2. Detectar si el mensaje requiere información específica
      const needsKnowledge = this.detectKnowledgeRequirement(userMessage);
      
      if (!needsKnowledge) {
        return {
          useRAG: false,
          fallbackToAI: true,
          enhancedPrompt: this.buildEnhancedPrompt(userMessage, conversationContext)
        };
      }

      // 3. Ejecutar consulta RAG
      const ragQuery: RAGQuery = {
        query: userMessage,
        chatbotId,
        maxResults: 3,
        similarityThreshold: 0.6
      };

      const ragResponse = await this.ragService.query(ragQuery);

      // 4. Evaluar calidad de la respuesta RAG
      if (ragResponse.confidence >= 0.7 && ragResponse.sources.length > 0) {
        return {
          useRAG: true,
          ragAnswer: ragResponse.answer,
          ragSources: ragResponse.sources,
          ragConfidence: ragResponse.confidence,
          fallbackToAI: false
        };
      }

      // 5. Si RAG no es suficientemente confiable, usar como contexto para IA
      const enhancedPrompt = this.buildRAGEnhancedPrompt(
        userMessage, 
        ragResponse.sources,
        conversationContext
      );

      return {
        useRAG: false,
        fallbackToAI: true,
        enhancedPrompt
      };

    } catch (error) {
      this.logger.error(`Error en integración RAG: ${error.message}`);
      return {
        useRAG: false,
        fallbackToAI: true
      };
    }
  }

  /**
   * Detecta si el mensaje del usuario requiere información específica de la base de conocimiento
   */
  private detectKnowledgeRequirement(userMessage: string): boolean {
    const message = userMessage.toLowerCase();
    
    // Palabras clave que indican necesidad de información específica
    const knowledgeKeywords = [
      'qué es', 'cómo', 'cuándo', 'dónde', 'por qué', 'quién',
      'explica', 'describe', 'información sobre', 'detalles de',
      'proceso de', 'pasos para', 'instrucciones',
      'política de', 'procedimiento', 'reglas',
      'precios', 'costos', 'tarifas',
      'horarios', 'contacto', 'ubicación',
      'servicio', 'producto', 'especificaciones'
    ];

    // Palabras que indican conversación general (no requieren RAG)
    const generalKeywords = [
      'hola', 'gracias', 'adios', 'bien', 'mal',
      'si', 'no', 'ok', 'entiendo', 'perfecto'
    ];

    // Si contiene palabras generales y es corto, probablemente no necesita RAG
    if (message.length < 20 && generalKeywords.some(keyword => message.includes(keyword))) {
      return false;
    }

    // Si contiene palabras clave de conocimiento, probablemente necesita RAG
    return knowledgeKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Construye un prompt mejorado con contexto de la base de conocimiento
   */
  private buildRAGEnhancedPrompt(
    userMessage: string, 
    sources: any[], 
    conversationContext?: string
  ): string {
    let prompt = '';

    if (sources && sources.length > 0) {
      prompt += 'INFORMACIÓN DE LA BASE DE CONOCIMIENTO:\n';
      sources.forEach((source, index) => {
        prompt += `${index + 1}. ${source.title}: ${source.content}\n`;
      });
      prompt += '\n';
    }

    if (conversationContext) {
      prompt += `CONTEXTO DE LA CONVERSACIÓN:\n${conversationContext}\n\n`;
    }

    prompt += `MENSAJE DEL USUARIO: ${userMessage}\n\n`;
    prompt += 'Por favor, responde basándote en la información proporcionada. Si la información no es suficiente, indica qué información adicional necesitarías.';

    return prompt;
  }

  /**
   * Construye un prompt general mejorado
   */
  private buildEnhancedPrompt(userMessage: string, conversationContext?: string): string {
    let prompt = '';

    if (conversationContext) {
      prompt += `CONTEXTO DE LA CONVERSACIÓN:\n${conversationContext}\n\n`;
    }

    prompt += `MENSAJE DEL USUARIO: ${userMessage}`;

    return prompt;
  }

  /**
   * Formatea la respuesta RAG para el chat
   */
  formatRAGResponse(ragAnswer: string, sources: any[]): string {
    let response = ragAnswer;

    if (sources && sources.length > 0) {
      response += '\n\n📚 *Fuentes consultadas:*\n';
      sources.forEach((source, index) => {
        response += `${index + 1}. ${source.title}\n`;
      });
    }

    return response;
  }

  /**
   * Obtiene estadísticas de uso de RAG para un chatbot
   */
  async getRAGUsageStats(chatbotId: string, days: number = 30): Promise<any> {
    try {
      const stats = await this.ragService.getKnowledgeBaseStats(chatbotId);
      
      // Aquí podrías agregar más estadísticas específicas de uso
      return {
        ...stats,
        period: `${days} días`,
        lastUpdated: new Date()
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas RAG: ${error.message}`);
      return null;
    }
  }

  /**
   * Habilita o deshabilita RAG para un chatbot
   */
  async toggleRAGForChatbot(chatbotId: string, enabled: boolean): Promise<void> {
    try {
      const knowledgeBases = await this.ragService.listKnowledgeBases(chatbotId);
      
      // Actualizar estado de todas las bases de conocimiento del chatbot
      for (const kb of knowledgeBases) {
        // Aquí actualizarías el estado en la base de datos
        // Por ahora solo logueamos la acción
        this.logger.log(`RAG ${enabled ? 'habilitado' : 'deshabilitado'} para knowledge base ${kb.id}`);
      }
    } catch (error) {
      this.logger.error(`Error toggling RAG: ${error.message}`);
      throw error;
    }
  }
} 