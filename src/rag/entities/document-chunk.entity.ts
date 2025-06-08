import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { KnowledgeBase } from './knowledge-base.entity';

@Entity('rag_document_chunks')
@Index(['knowledgeBaseId', 'isActive'])
@Index(['knowledgeBaseId', 'chunkIndex'])
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con la base de conocimiento
  @ManyToOne(() => KnowledgeBase, kb => kb.chunks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'knowledge_base_id' })
  knowledgeBase: KnowledgeBase;

  @Column({ name: 'knowledge_base_id', type: 'uuid' })
  knowledgeBaseId: string;

  // Información del chunk
  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ name: 'token_count', type: 'int' })
  tokenCount: number;

  @Column({ name: 'start_position', type: 'int', nullable: true })
  startPosition: number;

  @Column({ name: 'end_position', type: 'int', nullable: true })
  endPosition: number;

  // Embeddings vectoriales (almacenado como JSON por compatibilidad)
  @Column('text', { nullable: true })
  embedding: string;

  @Column({ name: 'embedding_hash', type: 'text', nullable: true })
  embeddingHash: string;

  // Metadatos del chunk
  @Column('text', { nullable: true })
  metadata: string;

  // Estado y configuración
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'relevance_score', type: 'float', default: 0 })
  relevanceScore: number;

  @Column({ name: 'retrieval_count', type: 'int', default: 0 })
  retrievalCount: number;

  @Column({ name: 'last_retrieved_at', type: 'timestamp', nullable: true })
  lastRetrievedAt: Date;

  // Control de calidad
  @Column({ name: 'quality_score', type: 'float', nullable: true })
  qualityScore: number;

  @Column({ name: 'quality_metrics', type: 'text', nullable: true })
  qualityMetrics: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 