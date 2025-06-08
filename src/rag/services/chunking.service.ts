import { Injectable, Logger } from '@nestjs/common';

export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
  separators: string[];
  preserveStructure: boolean;
}

export interface DocumentChunk {
  content: string;
  title?: string;
  startPosition: number;
  endPosition: number;
  tokenCount: number;
  metadata: {
    pageNumber?: number;
    section?: string;
    heading?: string;
    language?: string;
    entities?: any[];
    keywords?: string[];
  };
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  /**
   * Divide un documento en chunks usando configuración específica
   */
  async chunkDocument(
    content: string,
    config: ChunkingConfig,
    documentMetadata?: any
  ): Promise<DocumentChunk[]> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('El contenido del documento no puede estar vacío');
      }

      const chunks: DocumentChunk[] = [];
      
      if (config.preserveStructure) {
        return await this.structuredChunking(content, config, documentMetadata);
      } else {
        return await this.simpleChunking(content, config, documentMetadata);
      }
    } catch (error) {
      this.logger.error(`Error en chunking de documento: ${error.message}`);
      throw error;
    }
  }

  /**
   * Chunking simple basado en separadores y tamaño
   */
  private async simpleChunking(
    content: string,
    config: ChunkingConfig,
    documentMetadata?: any
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const { chunkSize, chunkOverlap, separators } = config;

    // Normalizar separadores por prioridad
    const orderedSeparators = separators.length > 0 ? separators : ['\n\n', '\n', '. ', ' '];

    let remainingText = content;
    let currentPosition = 0;
    let chunkIndex = 0;

    while (remainingText.length > 0) {
      let chunkEnd = Math.min(chunkSize, remainingText.length);
      let actualChunk = remainingText.substring(0, chunkEnd);

      // Si no hemos alcanzado el final del documento, buscar un separador natural
      if (chunkEnd < remainingText.length) {
        let bestSeparatorPos = -1;
        
        for (const separator of orderedSeparators) {
          const separatorPos = actualChunk.lastIndexOf(separator);
          if (separatorPos > chunkSize * 0.5) { // Al menos 50% del chunk
            bestSeparatorPos = separatorPos + separator.length;
            break;
          }
        }

        if (bestSeparatorPos > -1) {
          chunkEnd = bestSeparatorPos;
          actualChunk = remainingText.substring(0, chunkEnd);
        }
      }

      // Crear el chunk
      const chunk: DocumentChunk = {
        content: actualChunk.trim(),
        startPosition: currentPosition,
        endPosition: currentPosition + chunkEnd,
        tokenCount: this.estimateTokenCount(actualChunk),
        metadata: {
          ...documentMetadata,
          chunkIndex
        }
      };

      // Extraer título del chunk si es posible
      const extractedTitle = this.extractChunkTitle(actualChunk);
      if (extractedTitle) {
        chunk.title = extractedTitle;
      }

      chunks.push(chunk);

      // Calcular próxima posición con overlap
      const nextStart = Math.max(chunkEnd - chunkOverlap, chunkEnd);
      remainingText = remainingText.substring(nextStart);
      currentPosition += nextStart;
      chunkIndex++;

      // Prevenir bucles infinitos
      if (chunkEnd === 0) {
        break;
      }
    }

    this.logger.log(`Documento dividido en ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Chunking que preserva estructura del documento
   */
  private async structuredChunking(
    content: string,
    config: ChunkingConfig,
    documentMetadata?: any
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    
    // Detectar estructura del documento
    const sections = this.detectDocumentStructure(content);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      if (section.content.length <= config.chunkSize) {
        // Sección completa cabe en un chunk
        chunks.push({
          content: section.content.trim(),
          title: section.title,
          startPosition: section.startPosition,
          endPosition: section.endPosition,
          tokenCount: this.estimateTokenCount(section.content),
          metadata: {
            ...documentMetadata,
            section: section.title,
            heading: section.level,
            pageNumber: section.pageNumber
          }
        });
      } else {
        // Dividir sección en múltiples chunks
        const sectionChunks = await this.simpleChunking(
          section.content,
          { ...config, preserveStructure: false },
          {
            ...documentMetadata,
            section: section.title,
            heading: section.level,
            pageNumber: section.pageNumber
          }
        );
        
        chunks.push(...sectionChunks);
      }
    }

    return chunks;
  }

  /**
   * Detecta la estructura del documento (headers, secciones, etc.)
   */
  private detectDocumentStructure(content: string): any[] {
    const sections = [];
    const lines = content.split('\n');
    
    let currentSection = {
      title: 'Introducción',
      level: 1,
      content: '',
      startPosition: 0,
      endPosition: 0,
      pageNumber: 1
    };

    let position = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detectar headers (líneas que parecen títulos)
      const headerMatch = line.match(/^(#{1,6})\s*(.+)$/) || // Markdown headers
                         line.match(/^([IVX]+\.|\d+\.)\s*(.+)$/) || // Numbered headers
                         (line.length > 0 && line.length < 100 && 
                          lines[i + 1] && lines[i + 1].match(/^[-=]{3,}$/)); // Underlined headers

      if (headerMatch && currentSection.content.trim().length > 0) {
        // Finalizar sección anterior
        currentSection.endPosition = position;
        sections.push({ ...currentSection });
        
        // Iniciar nueva sección
        currentSection = {
          title: headerMatch[2] || line,
          level: headerMatch[1] ? headerMatch[1].length : 1,
          content: '',
          startPosition: position,
          endPosition: 0,
          pageNumber: Math.floor(sections.length / 10) + 1 // Estimación simple
        };
      } else {
        currentSection.content += line + '\n';
      }
      
      position += line.length + 1; // +1 for newline
    }

    // Agregar última sección
    if (currentSection.content.trim().length > 0) {
      currentSection.endPosition = position;
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : [{
      title: 'Documento',
      level: 1,
      content: content,
      startPosition: 0,
      endPosition: content.length,
      pageNumber: 1
    }];
  }

  /**
   * Extrae un título representativo del chunk
   */
  private extractChunkTitle(content: string): string | null {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length === 0) return null;

    // Buscar primera línea que parezca un título
    for (const line of lines.slice(0, 3)) {
      if (line.length > 10 && line.length < 100 && 
          !line.endsWith('.') && 
          !line.includes('  ')) {
        return line;
      }
    }

    // Usar primeras palabras como título de fallback
    const firstSentence = lines[0];
    const words = firstSentence.split(' ').slice(0, 8).join(' ');
    return words.length > 20 ? words + '...' : words;
  }

  /**
   * Estima el número de tokens en un texto
   * Aproximación: 1 token ≈ 4 caracteres para texto en español
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Valida la configuración de chunking
   */
  validateChunkingConfig(config: ChunkingConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.chunkSize <= 0) {
      errors.push('El tamaño del chunk debe ser mayor a 0');
    }

    if (config.chunkSize > 32000) {
      errors.push('El tamaño del chunk no debe exceder 32000 caracteres');
    }

    if (config.chunkOverlap < 0) {
      errors.push('El overlap no puede ser negativo');
    }

    if (config.chunkOverlap >= config.chunkSize) {
      errors.push('El overlap debe ser menor al tamaño del chunk');
    }

    if (!Array.isArray(config.separators)) {
      errors.push('Los separadores deben ser un array de strings');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtiene configuración de chunking por defecto optimizada
   */
  getDefaultChunkingConfig(): ChunkingConfig {
    return {
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ', ', ' '],
      preserveStructure: true
    };
  }
} 