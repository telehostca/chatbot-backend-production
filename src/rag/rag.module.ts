import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

// Entidades
import { KnowledgeBase } from './entities/knowledge-base.entity';
import { DocumentChunk } from './entities/document-chunk.entity';

// Servicios
import { RAGService } from './services/rag.service';
import { EmbeddingService } from './services/embedding.service';
import { ChunkingService } from './services/chunking.service';
import { RAGIntegrationService } from './services/rag-integration.service';

// Controladores
import { RAGController } from './controllers/rag.controller';

// Módulos externos
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      KnowledgeBase,
      DocumentChunk
    ], 'users'),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB límite
        files: 1
      }
    }),
    AIModule
  ],
  controllers: [RAGController],
  providers: [
    RAGService,
    EmbeddingService,
    ChunkingService,
    RAGIntegrationService
  ],
  exports: [
    RAGService,
    EmbeddingService,
    ChunkingService,
    RAGIntegrationService
  ]
})
export class RAGModule {} 