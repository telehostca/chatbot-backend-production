import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsAppConfigService {
  private readonly logger = new Logger(WhatsAppConfigService.name);

  private readonly FIXED_CONFIG = {
    provider: 'Evolution API',
    apiUrl: 'https://api.zemog.info',
    apiKey: 'jesus88192*'
  };

  generateWhatsAppConfig(instanceName: string, phoneNumber: string): any {
    return {
      provider: this.FIXED_CONFIG.provider,
      apiUrl: this.FIXED_CONFIG.apiUrl,
      apiKey: this.FIXED_CONFIG.apiKey,
      instanceName: instanceName,
      phoneNumber: phoneNumber
    };
  }

  getFixedConfig() {
    return { ...this.FIXED_CONFIG };
  }

  extractAndNormalizeConfig(chatbotConfig: any): any {
    try {
      let instanceName = null;
      let phoneNumber = null;

      if (chatbotConfig?.whatsappConfig) {
        const config = typeof chatbotConfig.whatsappConfig === 'string'
          ? JSON.parse(chatbotConfig.whatsappConfig)
          : chatbotConfig.whatsappConfig;
        instanceName = config.instanceName;
        phoneNumber = config.phoneNumber;
      }

      if (!instanceName && chatbotConfig?.instanceName) {
        instanceName = chatbotConfig.instanceName;
        phoneNumber = chatbotConfig.phoneNumber;
      }

      if (!instanceName || !phoneNumber) {
        this.logger.error('❌ No se encontró configuración de instancia/teléfono');
        return null;
      }

      return this.generateWhatsAppConfig(instanceName, phoneNumber);
    } catch (error) {
      this.logger.error(`❌ Error extrayendo configuración: ${error.message}`);
      return null;
    }
  }
} 