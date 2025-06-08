import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBase } from '../entities/knowledge-base.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { EmbeddingService } from './embedding.service';
import { ChunkingService } from './chunking.service';
import { AiService } from '../../ai/ai.service';

export interface RAGQuery {
  query: string;
  chatbotId: string;
  maxResults?: number;
  similarityThreshold?: number;
  categories?: string[];
  tags?: string[];
}

export interface RAGResponse {
  answer: string;
  sources: {
    id: string;
    title: string;
    content: string;
    similarity: number;
    metadata?: any;
  }[];
  confidence: number;
  processingTime: number;
}

export interface ProcessDocumentOptions {
  chatbotId: string;
  title: string;
  content: string;
  documentType: string;
  category?: string;
  tags?: string[];
  sourceUrl?: string;
  metadata?: any;
}

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    @InjectRepository(KnowledgeBase, 'users')
    private readonly knowledgeBaseRepository: Repository<KnowledgeBase>,
    @InjectRepository(DocumentChunk, 'users')
    private readonly documentChunkRepository: Repository<DocumentChunk>,
    private readonly embeddingService: EmbeddingService,
    private readonly chunkingService: ChunkingService,
    private readonly aiService: AiService
  ) {}

  /**
   * Funciones auxiliares para manejar JSON en campos de texto
   */
  private parseJsonField(value: string | object): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        this.logger.warn(`Error parsing JSON field: ${error.message}`);
        return {};
      }
    }
    return value || {};
  }

  private stringifyJsonField(value: any): string {
    try {
      return JSON.stringify(value || {});
    } catch (error) {
      this.logger.warn(`Error stringifying JSON field: ${error.message}`);
      return '{}';
    }
  }

  private parseArrayField(value: string | string[]): string[] {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        // Si no es JSON válido, tratarlo como string separado por comas
        return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
      }
    }
    return Array.isArray(value) ? value : [];
  }

  private stringifyArrayField(value: string[] | string): string {
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return value || '[]';
  }

  /**
   * Procesa un documento y lo añade a la base de conocimiento
   */
  async processDocument(options: ProcessDocumentOptions): Promise<{ success: boolean; knowledgeBaseId: string; message: string }> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Iniciando procesamiento de documento: ${options.title}`);

      // 1. Crear entrada en knowledge base
      const knowledgeBase = this.knowledgeBaseRepository.create({
        chatbotId: options.chatbotId,
        title: options.title,
        documentType: options.documentType as any,
        sourceUrl: options.sourceUrl,
        category: options.category,
        tags: this.stringifyArrayField(options.tags || []),
        status: 'processing',
        chunkingConfig: this.stringifyJsonField(this.chunkingService.getDefaultChunkingConfig()),
        embeddingConfig: this.stringifyJsonField({
          model: 'sentence-transformers',
          modelName: 'all-MiniLM-L6-v2',
          dimensions: 384
        }),
        retrievalConfig: this.stringifyJsonField({
          similarityThreshold: 0.7,
          maxResults: 5,
          rerankEnabled: false,
          contextWindow: 4000
        }),
        metadata: this.stringifyJsonField(options.metadata || {})
      });

      const savedKnowledgeBase = await this.knowledgeBaseRepository.save(knowledgeBase);

      // 2. Dividir documento en chunks
      const chunks = await this.chunkingService.chunkDocument(
        options.content,
        this.parseJsonField(savedKnowledgeBase.chunkingConfig),
        { documentId: savedKnowledgeBase.id, ...options.metadata }
      );

      // 3. Generar embeddings para cada chunk
      let processedChunks = 0;
      const documentChunks: DocumentChunk[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          // Generar embedding - usar sentence-transformers como fallback confiable
          const embedding = await this.embeddingService.generateEmbedding(
            chunk.content,
            'sentence-transformers'  // Usar SentenceTransformers que siempre está disponible
          );

          // Validar embedding antes de guardar
          if (!Array.isArray(embedding) || embedding.length === 0) {
            this.logger.error(`❌ Embedding inválido para chunk ${i}: no es array válido`);
            continue;
          }

          // Validar que todos los valores sean números válidos
          const hasInvalidValues = embedding.some(val => isNaN(val) || !isFinite(val));
          if (hasInvalidValues) {
            this.logger.error(`❌ Embedding inválido para chunk ${i}: contiene valores no numéricos`);
            continue;
          }

          this.logger.log(`✅ Embedding generado para chunk ${i}: ${embedding.length} dimensiones`);

          // Crear chunk en BD
          const documentChunk = this.documentChunkRepository.create({
            knowledgeBaseId: savedKnowledgeBase.id,
            chunkIndex: i,
            content: chunk.content,
            title: chunk.title,
            tokenCount: chunk.tokenCount,
            startPosition: chunk.startPosition,
            endPosition: chunk.endPosition,
            embedding: this.stringifyJsonField(embedding),
            metadata: this.stringifyJsonField(chunk.metadata)
          });

          documentChunks.push(documentChunk);
          processedChunks++;

        } catch (error) {
          this.logger.error(`❌ Error procesando chunk ${i}: ${error.message}`);
          // Continuar con el siguiente chunk
        }
      }

      // 4. Guardar chunks en batch
      if (documentChunks.length > 0) {
        await this.documentChunkRepository.save(documentChunks);
      }

      // 5. Actualizar knowledge base
      await this.knowledgeBaseRepository.update(savedKnowledgeBase.id, {
        status: processedChunks > 0 ? 'processed' : 'error',
        totalChunks: chunks.length,
        processedChunks,
        totalTokens: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
        lastProcessedAt: new Date(),
        processingError: processedChunks === 0 ? 'No se pudieron procesar los chunks' : null
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(`Documento procesado en ${processingTime}ms: ${processedChunks}/${chunks.length} chunks`);

      return {
        success: processedChunks > 0,
        knowledgeBaseId: savedKnowledgeBase.id,
        message: `Documento procesado: ${processedChunks}/${chunks.length} fragmentos creados`
      };

    } catch (error) {
      this.logger.error(`Error procesando documento: ${error.message}`);
      throw error;
    }
  }

  /**
   * Realiza consulta RAG: recupera información relevante y genera respuesta
   */
  async query(ragQuery: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Ejecutando consulta RAG: ${ragQuery.query.substring(0, 100)}...`);

      // 1. Obtener configuración de embeddings del chatbot
      const knowledgeBase = await this.knowledgeBaseRepository.findOne({
        where: { chatbotId: ragQuery.chatbotId, isActive: true },
        order: { createdAt: 'DESC' }
      });

      if (!knowledgeBase) {
        return {
          answer: 'No hay base de conocimiento disponible para este chatbot.',
          sources: [],
          confidence: 0,
          processingTime: Date.now() - startTime
        };
      }

      // 2. Generar embedding de la consulta - usar sentence-transformers como fallback confiable
      const queryEmbedding = await this.embeddingService.generateEmbedding(
        ragQuery.query,
        'sentence-transformers'  // Usar SentenceTransformers que siempre está disponible
      );

      // 3. Buscar chunks más similares
      const similarChunks = await this.findSimilarChunks(
        ragQuery.chatbotId,
        queryEmbedding,
        ragQuery.maxResults || this.parseJsonField(knowledgeBase.retrievalConfig).maxResults,
        ragQuery.similarityThreshold || this.parseJsonField(knowledgeBase.retrievalConfig).similarityThreshold || 0.01,
        ragQuery.categories,
        ragQuery.tags,
        ragQuery.query
      );

      if (similarChunks.length === 0) {
        return {
          answer: 'No se encontró información relevante en la base de conocimiento.',
          sources: [],
          confidence: 0,
          processingTime: Date.now() - startTime
        };
      }

      // 4. Construir contexto para el LLM
      const context = this.buildContext(similarChunks, this.parseJsonField(knowledgeBase.retrievalConfig).contextWindow);

      // 5. Generar respuesta usando LLM
      const answer = await this.generateAnswer(ragQuery.query, context);

      // 6. Actualizar estadísticas de uso
      await this.updateRetrievalStats(similarChunks.map(c => c.id));

      const confidence = this.calculateConfidence(similarChunks);
      const processingTime = Date.now() - startTime;

      this.logger.log(`Consulta RAG completada en ${processingTime}ms con confianza ${confidence}`);

      return {
        answer,
        sources: similarChunks.map(chunk => ({
          id: chunk.id,
          title: chunk.title || 'Sin título',
          content: chunk.content.substring(0, 200) + '...',
          similarity: chunk.similarity,
          metadata: chunk.metadata
        })),
        confidence,
        processingTime
      };

    } catch (error) {
      this.logger.error(`Error en consulta RAG: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca chunks similares en la base de conocimiento - VERSIÓN ROBUSTA
   */
  private async findSimilarChunks(
    chatbotId: string,
    queryEmbedding: number[],
    maxResults: number,
    threshold: number,
    categories?: string[],
    tags?: string[],
    query?: string
  ): Promise<Array<DocumentChunk & { similarity: number }>> {
    try {
      this.logger.log(`🔍 Buscando chunks para chatbot: ${chatbotId}, threshold: ${threshold}`);

      // Obtener todos los chunks activos del chatbot con filtros mejorados
      const queryBuilder = this.documentChunkRepository
        .createQueryBuilder('chunk')
        .leftJoinAndSelect('chunk.knowledgeBase', 'kb')
        .where('kb.chatbotId = :chatbotId', { chatbotId })
        .andWhere('chunk.isActive = :isActive', { isActive: true })
        .andWhere('kb.status = :status', { status: 'processed' })
        .andWhere('chunk.embedding IS NOT NULL')
        .andWhere('chunk.embedding != :emptyJson', { emptyJson: '{}' })
        .andWhere('chunk.embedding != :emptyString', { emptyString: '' });

      if (categories && categories.length > 0) {
        queryBuilder.andWhere('kb.category IN (:...categories)', { categories });
      }

      if (tags && tags.length > 0) {
        // Buscar tags en el string JSON de manera más robusta
        const tagConditions = tags.map(tag => `(kb.tags LIKE '%"${tag}"%' OR kb.tags LIKE '%${tag}%')`).join(' OR ');
        queryBuilder.andWhere(`(${tagConditions})`);
      }

      const chunks = await queryBuilder.getMany();
      this.logger.log(`📊 Chunks encontrados en BD: ${chunks.length}`);

      if (chunks.length === 0) {
        this.logger.warn(`⚠️ No se encontraron chunks para chatbot ${chatbotId}`);
        return [];
      }

      // Calcular similitudes con manejo robusto de errores
      const similarities: Array<DocumentChunk & { similarity: number }> = [];
      let processedCount = 0;
      let errorCount = 0;

      for (const chunk of chunks) {
        try {
          // Parse robusto del embedding
          let chunkEmbedding: number[] = [];
          
          if (chunk.embedding) {
            const parsedEmbedding = this.parseJsonField(chunk.embedding);
            if (Array.isArray(parsedEmbedding) && parsedEmbedding.length > 0) {
              chunkEmbedding = parsedEmbedding;
            } else {
              this.logger.warn(`⚠️ Embedding inválido para chunk ${chunk.id}: no es array`);
              continue;
            }
          } else {
            this.logger.warn(`⚠️ Embedding vacío para chunk ${chunk.id}`);
            continue;
          }

          // Verificar que los embeddings tienen la misma dimensión
          if (chunkEmbedding.length !== queryEmbedding.length) {
            this.logger.warn(`⚠️ Dimensiones no coinciden para chunk ${chunk.id}: ${chunkEmbedding.length} vs ${queryEmbedding.length}`);
            continue;
          }

          // Calcular similaridad coseno
          const similarity = this.embeddingService.calculateCosineSimilarity(
            queryEmbedding, 
            chunkEmbedding
          );

          // Verificar que la similaridad es válida
          if (isNaN(similarity) || similarity < -1 || similarity > 1) {
            this.logger.warn(`⚠️ Similaridad inválida para chunk ${chunk.id}: ${similarity}`);
            continue;
          }

          similarities.push({
            ...chunk,
            similarity
          });

          processedCount++;

        } catch (error) {
          errorCount++;
          this.logger.error(`❌ Error procesando chunk ${chunk.id}: ${error.message}`);
        }
      }

      this.logger.log(`📊 Chunks procesados: ${processedCount}, errores: ${errorCount}`);

      // Si no hay resultados con similitud semántica, usar búsqueda por palabras clave
      let results = similarities
        .filter(result => result.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);

      if (results.length === 0) {
        this.logger.log(`🔍 No se encontraron resultados semánticos, intentando búsqueda por palabras clave...`);
        this.logger.log(`🔍 Query para keywords: "${query}"`);
        
        // Buscar por palabras clave en el contenido
        if (query && query.trim().length > 0) {
          const keywordResults = await this.findByKeywords(chatbotId, query, maxResults);
          
          if (keywordResults.length > 0) {
            this.logger.log(`✅ Encontrados ${keywordResults.length} resultados por palabras clave`);
            results = keywordResults.map(chunk => ({
              ...chunk,
              similarity: 0.06 // Similarity similar a la que estaba funcionando antes
            }));
          } else {
            this.logger.log(`⚠️ Búsqueda por palabras clave no encontró resultados`);
          }
        } else {
          this.logger.log(`⚠️ Query vacío o undefined para búsqueda por palabras clave`);
        }
      }

      this.logger.log(`✅ Resultados finales: ${results.length} chunks encontrados`);
      
      if (results.length > 0) {
        const topSimilarity = results[0].similarity;
        const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
        this.logger.log(`📊 Mejor similaridad: ${topSimilarity.toFixed(4)}, promedio: ${avgSimilarity.toFixed(4)}`);
      }

      return results;

    } catch (error) {
      this.logger.error(`❌ Error en findSimilarChunks: ${error.message}`);
      return [];
    }
  }

  /**
   * Construye el contexto para el LLM limitado por ventana de contexto
   */
  private buildContext(chunks: Array<DocumentChunk & { similarity: number }>, maxTokens: number): string {
    let context = '';
    let tokenCount = 0;

    for (const chunk of chunks) {
      const chunkText = `=== ${chunk.title || 'Fragmento'} ===\n${chunk.content}\n\n`;
      const chunkTokens = Math.ceil(chunkText.length / 4); // Estimación

      if (tokenCount + chunkTokens > maxTokens) {
        break;
      }

      context += chunkText;
      tokenCount += chunkTokens;
    }

    return context;
  }

  /**
   * Genera respuesta usando el LLM con el contexto recuperado
   */
  private async generateAnswer(query: string, context: string): Promise<string> {
    const prompt = `Basándote en el siguiente contexto, responde la pregunta de manera precisa y completa. Si la información no está en el contexto, indica que no tienes esa información específica.

CONTEXTO:
${context}

PREGUNTA: ${query}

RESPUESTA:`;

    try {
      const response = await this.aiService.generateResponse(prompt, []);
      return response;
    } catch (error) {
      this.logger.error(`Error generando respuesta: ${error.message}`);
      return 'Lo siento, no pude generar una respuesta en este momento. Por favor, intenta nuevamente.';
    }
  }

  /**
   * Calcula la confianza de la respuesta basada en las similitudes
   */
  private calculateConfidence(chunks: Array<{ similarity: number }>): number {
    if (chunks.length === 0) return 0;

    const avgSimilarity = chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / chunks.length;
    const maxSimilarity = Math.max(...chunks.map(c => c.similarity));
    
    // Combinar similitud promedio y máxima para calcular confianza
    return Math.round((avgSimilarity * 0.6 + maxSimilarity * 0.4) * 100) / 100;
  }

  /**
   * Actualiza estadísticas de recuperación de chunks
   */
  private async updateRetrievalStats(chunkIds: string[]): Promise<void> {
    try {
      await this.documentChunkRepository
        .createQueryBuilder()
        .update(DocumentChunk)
        .set({
          retrievalCount: () => 'retrievalCount + 1',
          lastRetrievedAt: new Date()
        })
        .whereInIds(chunkIds)
        .execute();
    } catch (error) {
      this.logger.error(`Error actualizando estadísticas: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas de la base de conocimiento de un chatbot
   */
  async getKnowledgeBaseStats(chatbotId: string): Promise<any> {
    const stats = await this.knowledgeBaseRepository
      .createQueryBuilder('kb')
      .leftJoinAndSelect('kb.chunks', 'chunk')
      .where('kb.chatbotId = :chatbotId', { chatbotId })
      .select([
        'COUNT(kb.id) as totalDocuments',
        'COUNT(CASE WHEN kb.status = :processed THEN 1 END) as processedDocuments',
        'COUNT(CASE WHEN kb.isActive = true THEN 1 END) as activeDocuments',
        'SUM(kb.totalChunks) as totalChunks',
        'SUM(kb.totalTokens) as totalTokens'
      ])
      .setParameter('processed', 'processed')
      .getRawOne();

    return stats;
  }

  /**
   * Lista bases de conocimiento de un chatbot
   */
  async listKnowledgeBases(chatbotId: string): Promise<KnowledgeBase[]> {
    return await this.knowledgeBaseRepository.find({
      where: { chatbotId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Elimina una base de conocimiento y todos sus chunks
   */
  async deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    await this.knowledgeBaseRepository.delete(knowledgeBaseId);
    // Los chunks se eliminan automáticamente por CASCADE
  }

  /**
   * Debug chunks almacenados para un chatbot
   */
  async debugChunks(chatbotId: string): Promise<any> {
    try {
      // Obtener knowledge bases
      const knowledgeBases = await this.knowledgeBaseRepository.find({
        where: { chatbotId },
        relations: ['chunks']
      });

      const debugInfo = {
        chatbotId,
        totalKnowledgeBases: knowledgeBases.length,
        knowledgeBases: []
      };

      for (const kb of knowledgeBases) {
        const chunks = await this.documentChunkRepository.find({
          where: { knowledgeBaseId: kb.id },
          select: ['id', 'chunkIndex', 'content', 'embedding', 'isActive']
        });

        const kbInfo = {
          id: kb.id,
          title: kb.title,
          status: kb.status,
          totalChunks: chunks.length,
          chunks: chunks.map(chunk => ({
            id: chunk.id,
            index: chunk.chunkIndex,
            contentLength: chunk.content?.length || 0,
            contentPreview: chunk.content?.substring(0, 100) + '...',
            hasEmbedding: !!chunk.embedding && chunk.embedding !== '{}' && chunk.embedding !== '',
            embeddingLength: chunk.embedding ? this.parseJsonField(chunk.embedding).length || 0 : 0,
            isActive: chunk.isActive
          }))
        };

        debugInfo.knowledgeBases.push(kbInfo);
      }

      return debugInfo;
    } catch (error) {
      this.logger.error(`Error en debugChunks: ${error.message}`);
      throw error;
    }
  }

  /**
   * Consulta RAG simplificada que usa búsqueda de texto simple si embeddings fallan
   */
  async simpleQuery(query: string, chatbotId: string): Promise<any> {
    try {
      this.logger.log(`🔍 Consulta simple: "${query}" para chatbot: ${chatbotId}`);

      // Primero intentar con embeddings
      try {
        const ragResult = await this.query({
          query,
          chatbotId,
          maxResults: 3,
          similarityThreshold: 0.1
        });

        if (ragResult.sources.length > 0) {
          this.logger.log(`✅ Consulta embeddings exitosa: ${ragResult.sources.length} fuentes`);
          return ragResult;
        }
      } catch (error) {
        this.logger.warn(`⚠️ Embeddings fallaron: ${error.message}`);
      }

      // Fallback: búsqueda de texto simple
      this.logger.log(`🔄 Usando fallback de búsqueda de texto simple`);

      const chunks = await this.documentChunkRepository
        .createQueryBuilder('chunk')
        .leftJoinAndSelect('chunk.knowledgeBase', 'kb')
        .where('kb.chatbotId = :chatbotId', { chatbotId })
        .andWhere('chunk.isActive = true')
        .andWhere('kb.status = :status', { status: 'processed' })
        .getMany();

      if (chunks.length === 0) {
        return {
          answer: 'No se encontró información en la base de conocimiento.',
          sources: [],
          confidence: 0,
          processingTime: 0,
          method: 'simple-text-search',
          chunksAvailable: 0
        };
      }

      // Búsqueda simple por palabras clave
      const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
      const matchingChunks = [];

      for (const chunk of chunks) {
        const content = chunk.content.toLowerCase();
        let matchCount = 0;

        for (const word of queryWords) {
          if (content.includes(word)) {
            matchCount++;
          }
        }

        if (matchCount > 0) {
          const similarity = matchCount / queryWords.length;
          matchingChunks.push({
            ...chunk,
            similarity,
            matchCount,
            matchWords: queryWords.filter(word => content.includes(word))
          });
        }
      }

      // Ordenar por relevancia
      matchingChunks.sort((a, b) => b.similarity - a.similarity);
      const topChunks = matchingChunks.slice(0, 3);

      if (topChunks.length === 0) {
        return {
          answer: 'No se encontró información relevante para tu consulta.',
          sources: [],
          confidence: 0,
          processingTime: 0,
          method: 'simple-text-search',
          chunksAvailable: chunks.length,
          queryWords
        };
      }

      // Construir contexto
      const context = topChunks
        .map(chunk => `${chunk.title || 'Información'}: ${chunk.content}`)
        .join('\n\n');

      // Generar respuesta
      const answer = await this.generateSimpleAnswer(query, context, topChunks);

      const confidence = topChunks.length > 0 ? topChunks[0].similarity : 0;

      return {
        answer,
        sources: topChunks.map(chunk => ({
          id: chunk.id,
          title: chunk.title || 'Sin título',
          content: chunk.content.substring(0, 200) + '...',
          similarity: chunk.similarity,
          matchCount: chunk.matchCount,
          matchWords: chunk.matchWords
        })),
        confidence,
        processingTime: 0,
        method: 'simple-text-search',
        chunksAvailable: chunks.length,
        queryWords
      };

    } catch (error) {
      this.logger.error(`Error en consulta simple: ${error.message}`);
      throw error;
    }
  }

  /**
   * Búsqueda por palabras clave como fallback cuando la similitud semántica no encuentra resultados
   */
  private async findByKeywords(chatbotId: string, query: string, maxResults: number): Promise<DocumentChunk[]> {
    try {
      this.logger.log(`🔎 Buscando por palabras clave: "${query}"`);
      
      // Extraer palabras clave de la consulta
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2) // Solo palabras de más de 2 caracteres
        .filter(word => !['que', 'cual', 'como', 'donde', 'cuando', 'por', 'para', 'con', 'sin', 'del', 'las', 'los', 'una', 'uno'].includes(word));

      if (keywords.length === 0) {
        this.logger.warn('⚠️ No se encontraron palabras clave válidas');
        return [];
      }

      this.logger.log(`🔑 Palabras clave extraídas: ${keywords.join(', ')}`);

      // Construir consulta SQL para búsqueda de texto
      const queryBuilder = this.documentChunkRepository
        .createQueryBuilder('chunk')
        .leftJoinAndSelect('chunk.knowledgeBase', 'kb')
        .where('kb.chatbotId = :chatbotId', { chatbotId })
        .andWhere('chunk.isActive = :isActive', { isActive: true })
        .andWhere('kb.status = :status', { status: 'processed' });

      // Agregar condiciones de búsqueda por palabras clave
      const conditions = keywords.map((keyword, index) => 
        `(LOWER(chunk.content) LIKE :keyword${index} OR LOWER(chunk.title) LIKE :keyword${index})`
      );
      
      queryBuilder.andWhere(`(${conditions.join(' OR ')})`);
      
      // Establecer parámetros
      keywords.forEach((keyword, index) => {
        queryBuilder.setParameter(`keyword${index}`, `%${keyword}%`);
      });

      const results = await queryBuilder
        .limit(maxResults)
        .getMany();

      this.logger.log(`✅ Encontrados ${results.length} resultados por palabras clave`);
      
      return results;

    } catch (error) {
      this.logger.error(`❌ Error en búsqueda por palabras clave: ${error.message}`);
      return [];
    }
  }

  /**
   * Genera respuesta usando contexto simple
   */
  private async generateSimpleAnswer(query: string, context: string, chunks: any[]): Promise<string> {
    try {
      const prompt = `Basándote en la siguiente información, responde la pregunta de manera clara y precisa:

INFORMACIÓN DISPONIBLE:
${context}

PREGUNTA: ${query}

RESPUESTA:`;

      const response = await this.aiService.generateResponse(prompt, []);
      return response;
    } catch (error) {
      this.logger.error(`Error generando respuesta simple: ${error.message}`);
      
      // Fallback mejorado - generar respuesta directa basada en el contexto
      if (chunks && chunks.length > 0) {
        const relevantChunk = chunks[0];
        const content = relevantChunk.content;
        
        // Analizar la query para dar una respuesta más específica
        const queryLower = query.toLowerCase();
        
        if (queryLower.includes('horario') || queryLower.includes('hora') || queryLower.includes('abierto') || queryLower.includes('cerrado')) {
          const horarioMatch = content.match(/horario[s]?[^.]*[0-9][^.]*/i);
          if (horarioMatch) {
            return `📅 Horarios de atención: ${horarioMatch[0].replace(/horario[s]?\s*de\s*atención:\s*/i, '')}`;
          }
        }
        
        if (queryLower.includes('delivery') || queryLower.includes('domicilio') || queryLower.includes('envío')) {
          const deliveryMatch = content.match(/delivery[^.]*|domicilio[^.]*|envío[^.]*/i);
          if (deliveryMatch) {
            return `🚚 Servicio de delivery: ${deliveryMatch[0]}`;
          }
        }
        
        if (queryLower.includes('ubicación') || queryLower.includes('dirección') || queryLower.includes('dónde') || queryLower.includes('ubicado')) {
          const locationMatch = content.match(/ubicado\s+en[^.]*|dirección[^.]*|[A-Z][^.]*Venezuela[^.]*/i);
          if (locationMatch) {
            return `📍 Ubicación: ${locationMatch[0]}`;
          }
        }
        
        if (queryLower.includes('teléfono') || queryLower.includes('contacto') || queryLower.includes('llamar')) {
          const phoneMatch = content.match(/teléfono[^.]*|contacto[^.]*|\+?[0-9-\s]{10,}/i);
          if (phoneMatch) {
            return `📞 Contacto: ${phoneMatch[0]}`;
          }
        }
        
        if (queryLower.includes('producto') || queryLower.includes('vende') || queryLower.includes('ofrece')) {
          const productMatch = content.match(/producto[s]?[^.]*|vende[^.]*|ofrece[^.]*/i);
          if (productMatch) {
            return `🛒 Productos: ${productMatch[0]}`;
          }
        }
        
        // Respuesta genérica mejorada con el contenido relevante
        return `Basándome en la información disponible: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`;
      }
      
      return 'Lo siento, no pude generar una respuesta en este momento.';
    }
  }

}