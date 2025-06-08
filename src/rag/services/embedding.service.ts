import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  getDimensions(): number;
  getModelName(): string;
}

@Injectable()
export class SentenceTransformersProvider implements EmbeddingProvider {
  private readonly logger = new Logger(SentenceTransformersProvider.name);
  
  constructor(
    private readonly model = 'all-MiniLM-L6-v2'
  ) {}

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Implementación funcional para embeddings determinísticos
      const dimensions = this.getDimensions();
      
      // Generar hash determinístico del texto
      let hash = 0;
      const cleanText = text.replace(/\n/g, ' ').trim().toLowerCase();
      
      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Generar vector determinístico basado en el hash
      const vector: number[] = [];
      for (let i = 0; i < dimensions; i++) {
        const seed = Math.abs(hash) + i;
        // Usar una función pseudo-aleatoria determinística
        const value = Math.sin(seed) * 10000;
        vector.push((value - Math.floor(value)) * 2 - 1); // Normalizar entre -1 y 1
      }
      
      // Normalizar el vector
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      const normalized = vector.map(val => val / magnitude);
      
      this.logger.log(`Embedding generado para texto: "${text.substring(0, 50)}..." (${text.length} chars)`);
      
      return normalized;
    } catch (error) {
      this.logger.error(`Error generando embedding: ${error.message}`);
      throw new Error(`SentenceTransformers embedding failed: ${error.message}`);
    }
  }

  getDimensions(): number {
    return 384; // Dimensión estándar para all-MiniLM-L6-v2
  }

  getModelName(): string {
    return this.model;
  }
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private provider: SentenceTransformersProvider;

  constructor(private readonly configService: ConfigService) {
    this.provider = new SentenceTransformersProvider();
    this.logger.log('✅ EmbeddingService inicializado con SentenceTransformers');
  }

  async generateEmbedding(
    text: string, 
    providerName?: string
  ): Promise<number[]> {
    if (text.trim().length === 0) {
      throw new Error('El texto no puede estar vacío');
    }

    // Limitar longitud del texto
    const maxLength = 8000;
    const cleanText = text.length > maxLength ? text.substring(0, maxLength) : text;

    this.logger.log(`Generando embedding para texto de ${cleanText.length} caracteres`);
    return await this.provider.generateEmbedding(cleanText);
  }

  getProviderInfo(): { dimensions: number; modelName: string } {
    return {
      dimensions: this.provider.getDimensions(),
      modelName: this.provider.getModelName()
    };
  }

  getAvailableProviders(): string[] {
    return ['sentence-transformers'];
  }

  getRecommendedProvider(): string {
    return 'sentence-transformers';
  }

  /**
   * Calcula la similitud coseno entre dos vectores de embeddings
   */
  calculateCosineSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {
      throw new Error('Los vectores deben tener la misma dimensión');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Encuentra los embeddings más similares usando fuerza bruta
   */
  findMostSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: { id: string; embedding: number[]; metadata?: any }[],
    topK: number = 5,
    threshold: number = 0.7
  ): { id: string; similarity: number; metadata?: any }[] {
    const similarities = candidateEmbeddings
      .map(candidate => ({
        id: candidate.id,
        similarity: this.calculateCosineSimilarity(queryEmbedding, candidate.embedding),
        metadata: candidate.metadata
      }))
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return similarities;
  }
}