import { GenericChatbotService } from './generic-chatbot.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChatbotFactoryCleanService {
  private readonly logger = new Logger(ChatbotFactoryCleanService.name);

  constructor(
    private readonly genericService: GenericChatbotService,
  ) {}

  async createChatbotService(chatbotId: string, config: any): Promise<any> {
    this.logger.log(`Factory creando servicio para chatbot: ${chatbotId}`);
    const chatbotType = this.extractChatbotType(config);
    this.logger.log(`Tipo detectado: ${chatbotType}`);
    return this.genericService;
  }

  async handleMessage(chatbotId: string, message: string, from: string, chatbotConfig: any): Promise<string> {
    this.logger.log(`Factory procesando mensaje para chatbot ${chatbotId}: ${message}`);
    return await this.genericService.handleMessage(message, from, chatbotConfig, chatbotId);
  }

  private extractChatbotType(config: any): string {
    try {
      if (config?.chatbotConfig) {
        const chatbotConfig = typeof config.chatbotConfig === 'string' 
          ? JSON.parse(config.chatbotConfig) 
          : config.chatbotConfig;
        
        if (chatbotConfig?.type) {
          return chatbotConfig.type;
        }
      }

      if (config?.aiConfig) {
        const aiConfig = typeof config.aiConfig === 'string'
          ? JSON.parse(config.aiConfig)
          : config.aiConfig;
        
        if (aiConfig?.type) {
          return aiConfig.type;
        }
      }

      return 'basic';

    } catch (error) {
      this.logger.error(`Error extrayendo tipo: ${error.message}`);
      return 'basic';
    }
  }
}
