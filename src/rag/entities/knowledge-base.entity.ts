import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { ChatbotInstance } from '../../admin/entities/chatbot-instance.entity';
import { DocumentChunk } from './document-chunk.entity';

export enum DocumentType {
  PDF = 'pdf',
  TXT = 'txt',
  DOC = 'doc',
  DOCX = 'docx',
  HTML = 'html',
  MD = 'md',
  URL = 'url',
  API = 'api'
}

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  ERROR = 'error',
  DISABLED = 'disabled'
}

@Entity('rag_knowledge_base')
@Index(['chatbotId', 'isActive'])
@Index(['chatbotId', 'category'])
export class KnowledgeBase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con el chatbot
  @ManyToOne(() => ChatbotInstance, chatbot => chatbot.knowledgeBases)
  @JoinColumn({ name: 'chatbot_id' })
  chatbot: ChatbotInstance;

  @Column({ name: 'chatbot_id', type: 'uuid' })
  chatbotId: string;

  // Información del documento
  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'document_type',
    type: 'varchar',
    length: 20,
    default: 'txt'
  })
  documentType: string;

  @Column({ name: 'source_url', type: 'text', nullable: true })
  sourceUrl: string;

  @Column({ name: 'file_path', type: 'text', nullable: true })
  filePath: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column('text', { nullable: true })
  tags: string;

  // Configuración de procesamiento
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending'
  })
  status: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  // Metadatos del procesamiento
  @Column({ name: 'total_chunks', type: 'int', default: 0 })
  totalChunks: number;

  @Column({ name: 'processed_chunks', type: 'int', default: 0 })
  processedChunks: number;

  @Column({ name: 'total_tokens', type: 'int', default: 0 })
  totalTokens: number;

  @Column({ name: 'processing_error', type: 'text', nullable: true })
  processingError: string;

  @Column({ name: 'last_processed_at', type: 'timestamp', nullable: true })
  lastProcessedAt: Date;

  // Configuración de chunking
  @Column({ name: 'chunking_config', type: 'text' })
  chunkingConfig: string;

  // Configuración de embeddings
  @Column({ name: 'embedding_config', type: 'text' })
  embeddingConfig: string;

  // Configuración de recuperación
  @Column({ name: 'retrieval_config', type: 'text' })
  retrievalConfig: string;

  // Metadatos adicionales
  @Column('text', { nullable: true })
  metadata: string;

  // Relaciones
  @OneToMany(() => DocumentChunk, chunk => chunk.knowledgeBase)
  chunks: DocumentChunk[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 