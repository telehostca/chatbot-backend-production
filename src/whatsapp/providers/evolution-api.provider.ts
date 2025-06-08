import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WhatsAppProvider, WhatsAppMessage, WhatsAppStatus } from '../interfaces/whatsapp-provider.interface';

@Injectable()
export class EvolutionApiProvider implements WhatsAppProvider {
  private readonly logger = new Logger(EvolutionApiProvider.name);
  private readonly defaultApiUrl: string;
  private readonly defaultApiKey: string;

  constructor(private configService: ConfigService) {
    this.defaultApiUrl = this.configService.get<string>('evolution.apiUrl');
    this.defaultApiKey = this.configService.get<string>('evolution.apiKey');
  }

  async initialize(config?: any): Promise<void> {
    try {
      const apiUrl = config?.apiUrl || this.defaultApiUrl;
      const apiKey = config?.apiKey || this.defaultApiKey;
      const instanceId = config?.instanceId;

      if (!instanceId) {
        throw new Error('Se requiere un ID de instancia para inicializar Evolution API');
      }

      const response = await axios.post(
        `${apiUrl}/instance/connect/${instanceId}`,
        {},
        {
          headers: {
            'apikey': apiKey
          }
        }
      );

      if (!response.data.success) {
        throw new Error(`Error al conectar instancia: ${response.data.message}`);
      }

      this.logger.log(`Instancia ${instanceId} conectada exitosamente`);
    } catch (error) {
      this.logger.error(`Error inicializando Evolution API: ${error.message}`);
      throw error;
    }
  }

  async disconnect(config?: any): Promise<WhatsAppStatus> {
    try {
      const apiUrl = config?.apiUrl || this.defaultApiUrl;
      const apiKey = config?.apiKey || this.defaultApiKey;
      const instanceId = config?.instanceId;

      if (!instanceId) {
        throw new Error('Se requiere un ID de instancia para desconectar Evolution API');
      }

      await axios.delete(
        `${apiUrl}/instance/logout/${instanceId}`,
        {
          headers: {
            'apikey': apiKey
          }
        }
      );

      this.logger.log(`Instancia ${instanceId} desconectada exitosamente`);
      
      // Devolver estado desconectado
      return {
        state: 'disconnected',
        description: 'Instancia desconectada exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error desconectando Evolution API: ${error.message}`);
      
      // Devolver estado de error
      return {
        state: 'error',
        description: `Error al desconectar: ${error.message}`
      };
    }
  }

  async sendMessage(to: string, message: string, config?: any): Promise<WhatsAppMessage> {
    try {
      const apiUrl = config?.apiUrl || this.defaultApiUrl;
      const apiKey = config?.apiKey || this.defaultApiKey;
      const instanceId = config?.instanceId;

      if (!instanceId) {
        throw new Error('Se requiere un ID de instancia para enviar mensajes');
      }

      // Validar que el número de teléfono tiene un formato apropiado
      // Debe ser un número, no un mensaje completo
      const normalizedNumber = this.normalizePhoneNumber(to);
      if (!normalizedNumber) {
        throw new Error(`Número de teléfono inválido: ${to}`);
      }
      if (!normalizedNumber) {
        throw new Error(`Número de teléfono inválido: ${to}`);
      }

      // Limpiar la URL base para evitar dobles barras
      const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      const fullUrl = `${cleanApiUrl}/message/sendText/${instanceId}`;
      
      this.logger.log(`🌐 URL completa para envío: ${fullUrl}`);
      this.logger.log(`🔑 API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NO CONFIGURADA'}`);
      this.logger.log(`📱 Instancia: ${instanceId}`);
      this.logger.log(`📨 Enviando a: ${normalizedNumber}`);
      this.logger.log(`💬 Mensaje: ${typeof message === 'string' ? message.substring(0, 100) + '...' : JSON.stringify(message)}`);

      const response = await axios.post(
        fullUrl,
        {
          number: normalizedNumber,
          text: message,
          delay: 1200,
          linkPreview: false
        },
        {
          headers: {
            'apikey': apiKey
          }
        }
      );

      this.logger.log(`✅ Respuesta de Evolution API:`, response.data);

      return {
        from: 'system',
        to: normalizedNumber,
        body: message,
        timestamp: new Date(),
        type: 'text',
        instanceId,
        messageId: response.data.key?.id || ''
      };
    } catch (error) {
      this.logger.error(`❌ Error enviando mensaje a Evolution API:`);
      this.logger.error(`URL: ${config?.apiUrl || this.defaultApiUrl}/message/sendText/${config?.instanceId}`);
      this.logger.error(`Status: ${error.response?.status}`);
      this.logger.error(`Response: ${JSON.stringify(error.response?.data)}`);
      this.logger.error(`Message: ${error.message}`);
      throw error;
    }
  }

  private normalizePhoneNumber(phone: string): string | null {
    if (!phone || typeof phone !== 'string') {
      this.logger.error(`❌ Error: Número de teléfono inválido: ${phone}`);
      return null;
    }
    
    // ENHANCED: Additional validation to detect message content as phone number
    if (phone.includes('hola') || phone.includes('cedula') || phone.includes('busco')) {
      this.logger.error(`⚠️ ERROR: Message content detected as phone number: "${phone.substring(0, 30)}..."`);
      return null;
    }
    
    // Si el teléfono parece un mensaje completo (contiene espacios, letras, o caracteres especiales)
    if (phone.includes(' ') || phone.length > 25 || /[a-zA-Z,;:]/.test(phone)) {
      this.logger.error(`⚠️ Posible error: Texto detectado como número: "${phone.substring(0, 30)}..."`);
      return null;
    }

    // Eliminar caracteres no numéricos
    let normalized = phone.replace(/\D/g, '');
    
    // Validar longitud mínima (código país + número)
    if (normalized.length < 10) {
      this.logger.error(`❌ Error: Número demasiado corto: ${normalized}`);
      return null;
    }

    // Asegurar que el número tiene el formato correcto para WhatsApp
    if (normalized.startsWith('00')) {
      normalized = normalized.substring(2);
    } else if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }
    
    // Añadir sufijo de WhatsApp si no lo tiene
    if (!normalized.includes('@')) {
      normalized = `${normalized}@s.whatsapp.net`;
    }
    
    this.logger.log(`📱 Número normalizado: ${normalized}`);
    
    return normalized;
  }

  async sendImage(to: string, imageUrl: string, caption: string, config?: any): Promise<WhatsAppMessage> {
    try {
      const apiUrl = config?.apiUrl || this.defaultApiUrl;
      const apiKey = config?.apiKey || this.defaultApiKey;
      const instanceId = config?.instanceId;

      if (!instanceId) {
        throw new Error('Se requiere un ID de instancia para enviar imágenes');
      }

      // Normalizar y validar el número de teléfono
      const normalizedNumber = this.normalizePhoneNumber(to);
      if (!normalizedNumber) {
        throw new Error(`Número de teléfono inválido: ${to}`);
      }
      if (!normalizedNumber) {
        throw new Error(`Número de teléfono inválido: ${to}`);
      }

      // Limpiar la URL base para evitar dobles barras
      const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      
      const response = await axios.post(
        `${cleanApiUrl}/message/sendMedia/${instanceId}`,
        {
          number: normalizedNumber,
          mediatype: "image",
          media: imageUrl,
          caption: caption,
          delay: 1200
        },
        {
          headers: {
            'apikey': apiKey
          }
        }
      );

      return {
        from: 'system',
        to: normalizedNumber,
        body: caption,
        timestamp: new Date(),
        type: 'image',
        instanceId,
        messageId: response.data.key?.id || '',
        metadata: { imageUrl }
      };
    } catch (error) {
      this.logger.error(`Error enviando imagen: ${error.message}`);
      throw error;
    }
  }

  async sendDocument(to: string, documentUrl: string, caption: string, config?: any): Promise<WhatsAppMessage> {
    try {
      const apiUrl = config?.apiUrl || this.defaultApiUrl;
      const apiKey = config?.apiKey || this.defaultApiKey;
      const instanceId = config?.instanceId;

      if (!instanceId) {
        throw new Error('Se requiere un ID de instancia para enviar documentos');
      }

      // Normalizar y validar el número de teléfono
      const normalizedNumber = this.normalizePhoneNumber(to);
      if (!normalizedNumber) {
        throw new Error(`Número de teléfono inválido: ${to}`);
      }
      if (!normalizedNumber) {
        throw new Error(`Número de teléfono inválido: ${to}`);
      }

      const response = await axios.post(
        `${apiUrl}/message/sendMedia/${instanceId}`,
        {
          number: normalizedNumber,
          mediatype: "document",
          media: documentUrl,
          caption: caption,
          delay: 1200
        },
        {
          headers: {
            'apikey': apiKey
          }
        }
      );

      return {
        from: 'system',
        to: normalizedNumber,
        body: caption,
        timestamp: new Date(),
        type: 'document',
        instanceId,
        messageId: response.data.key?.id || '',
        metadata: { documentUrl }
      };
    } catch (error) {
      this.logger.error(`Error enviando documento: ${error.message}`);
      throw error;
    }
  }

  async sendAudio(to: string, audioUrl: string, config?: any): Promise<WhatsAppMessage> {
    try {
      const apiUrl = config?.apiUrl || this.defaultApiUrl;
      const apiKey = config?.apiKey || this.defaultApiKey;
      const instanceId = config?.instanceId;

      if (!instanceId) {
        throw new Error('Se requiere un ID de instancia para enviar audios');
      }

      // Normalizar y validar el número de teléfono
      const normalizedNumber = this.normalizePhoneNumber(to);
      if (!normalizedNumber) {
        throw new Error(`Número de teléfono inválido: ${to}`);
      }
      if (!normalizedNumber) {
        throw new Error(`Número de teléfono inválido: ${to}`);
      }

      const response = await axios.post(
        `${apiUrl}/message/sendMedia/${instanceId}`,
        {
          number: normalizedNumber,
          mediatype: "audio",
          media: audioUrl,
          delay: 1200
        },
        {
          headers: {
            'apikey': apiKey
          }
        }
      );

      return {
        from: 'system',
        to: normalizedNumber,
        body: 'Audio',
        timestamp: new Date(),
        type: 'audio',
        instanceId,
        messageId: response.data.key?.id || '',
        metadata: { audioUrl }
      };
    } catch (error) {
      this.logger.error(`Error enviando audio: ${error.message}`);
      throw error;
    }
  }

  async getQRCode(config?: any): Promise<string> {
    try {
      const apiUrl = config?.apiUrl || this.defaultApiUrl;
      const apiKey = config?.apiKey || this.defaultApiKey;
      const instanceId = config?.instanceId;

      if (!instanceId) {
        throw new Error('Se requiere un ID de instancia para obtener el código QR');
      }

      const response = await axios.get(
        `${apiUrl}/instance/qr/${instanceId}`,
        {
          headers: {
            'apikey': apiKey
          }
        }
      );

      if (!response.data.qrcode) {
        throw new Error('No se pudo obtener el código QR');
      }

      return response.data.qrcode;
    } catch (error) {
      this.logger.error(`Error obteniendo código QR: ${error.message}`);
      throw error;
    }
  }

  async updateConfig(config: any): Promise<void> {
    try {
      const apiUrl = config?.apiUrl || this.defaultApiUrl;
      const apiKey = config?.apiKey || this.defaultApiKey;
      const instanceId = config?.instanceId;

      if (!instanceId) {
        throw new Error('Se requiere un ID de instancia para actualizar la configuración');
      }

      await axios.put(
        `${apiUrl}/instance/config/${instanceId}`,
        config,
        {
          headers: {
            'apikey': apiKey
          }
        }
      );

      this.logger.log(`Configuración actualizada para instancia ${instanceId}`);
    } catch (error) {
      this.logger.error(`Error actualizando configuración: ${error.message}`);
      throw error;
    }
  }

  async getConfig(config?: any): Promise<any> {
    try {
      const apiUrl = config?.apiUrl || this.defaultApiUrl;
      const apiKey = config?.apiKey || this.defaultApiKey;
      const instanceId = config?.instanceId;

      if (!instanceId) {
        throw new Error('Se requiere un ID de instancia para obtener la configuración');
      }

      const response = await axios.get(
        `${apiUrl}/instance/config/${instanceId}`,
        {
          headers: {
            'apikey': apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error obteniendo configuración: ${error.message}`);
      throw error;
    }
  }

  async sendLocation(to: string, latitude: number, longitude: number, config?: any): Promise<WhatsAppMessage> {
    try {
      const apiUrl = config?.apiUrl || this.defaultApiUrl;
      const apiKey = config?.apiKey || this.defaultApiKey;
      const instanceId = config?.instanceId;

      if (!instanceId) {
        throw new Error('Se requiere un ID de instancia para enviar ubicación');
      }

      const response = await axios.post(
        `${apiUrl}/message/sendLocation/${instanceId}`,
        {
          number: to,
          lat: latitude,
          lng: longitude,
          delay: 1200
        },
        {
          headers: {
            'apikey': apiKey
          }
        }
      );

      return {
        from: 'system',
        to,
        body: `Ubicación: ${latitude},${longitude}`,
        timestamp: new Date(),
        type: 'location',
        instanceId,
        messageId: response.data.key?.id || '',
        metadata: { latitude, longitude }
      };
    } catch (error) {
      this.logger.error(`Error enviando ubicación: ${error.message}`);
      throw error;
    }
  }
} 