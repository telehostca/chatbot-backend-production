/**
 * Módulo que maneja las interacciones con servicios de IA.
 * Este módulo proporciona:
 * - Servicio para generar respuestas de chat
 * - Servicio para transcribir audio
 * - Servicio para analizar imágenes
 * - Configuración de APIs de OpenAI
 * 
 * @module AiModule
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIService } from './openai.service';
import { AnthropicService } from './anthropic.service';
import { GoogleAIService } from './google-ai.service';
import { OllamaService } from './ollama.service';
import { AiService } from './ai.service';
import { DeepSeekService } from './deepseek.service';

@Module({
  imports: [ConfigModule],
  providers: [
    OpenAIService,
    AnthropicService,
    GoogleAIService,
    OllamaService,
    AiService,
    DeepSeekService
  ],
  exports: [
    OpenAIService,
    AnthropicService,
    GoogleAIService,
    OllamaService,
    AiService,
    DeepSeekService
  ]
})
export class AIModule {} 