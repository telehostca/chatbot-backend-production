import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { SpeechClient } from '@google-cloud/speech';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as crypto from 'crypto';
import * as FormData from 'form-data';
import * as hkdf from 'futoin-hkdf';
import * as mime from 'mime-types';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly speechClient: SpeechClient;
  private readonly visionClient: ImageAnnotatorClient;
  private readonly tempDir: string;
  private readonly apiKey: string;
  private readonly whisperUrl: string;
  private readonly uploadDir: string;
  private readonly allowedTypes: string[];

  constructor(private configService: ConfigService) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    this.speechClient = new SpeechClient();
    this.visionClient = new ImageAnnotatorClient();
    this.tempDir = path.join(process.cwd(), 'temp');
    this.apiKey = this.configService.get<string>('ai.apiKey');
    this.whisperUrl = this.configService.get<string>('ai.whisperUrl');
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
    this.allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'audio/mpeg',
      'audio/wav',
      'video/mp4',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    // Crear directorio temporal si no existe
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir);
    }

    // Crear directorio de uploads si no existe
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private async downloadFile(url: string, filePath: string, mediaKey?: string): Promise<void> {
    try {
      this.logger.log(`Iniciando descarga desde: ${url}`);
      
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'WhatsApp/2.23.24.82 A',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'apikey': this.apiKey
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      // Convertir la respuesta a base64
      const base64Data = Buffer.from(response.data).toString('base64');
      
      // Si hay mediaKey, descifrar el contenido
      if (mediaKey) {
        const decryptedData = await this.decryptBase64(base64Data, mediaKey);
        fs.writeFileSync(filePath, Buffer.from(decryptedData, 'base64'));
      } else {
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      }

      const stats = fs.statSync(filePath);
      this.logger.log(`Archivo descargado exitosamente: ${filePath} (${stats.size} bytes)`);
      
      if (stats.size === 0) {
        throw new Error('El archivo descargado está vacío');
      }
    } catch (error) {
      this.logger.error(`Error al descargar archivo: ${error.message}`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          this.logger.warn(`Error al eliminar archivo temporal: ${unlinkError.message}`);
        }
      }
      throw error;
    }
  }

  private async decryptBase64(base64Data: string, mediaKey: string, isPtt: boolean = false): Promise<string> {
    try {
      this.logger.log('Descifrando contenido base64 (WhatsApp)...');
      
      // Verificar que tengamos datos válidos
      if (!base64Data || !mediaKey) {
        this.logger.warn('Datos base64 o mediaKey vacíos');
        return base64Data;
      }
      
      // Convertir mediaKey de base64 a buffer
      const mediaKeyBuffer = Buffer.from(mediaKey, 'base64');
      
      // Verificación de la media key
      if (mediaKeyBuffer.length !== 32) {
        this.logger.warn(`Media key con longitud inválida: ${mediaKeyBuffer.length}, se esperan 32 bytes`);
        return base64Data;
      }
      
      // Decodificar los datos base64
      const encryptedData = Buffer.from(base64Data, 'base64');
      
      if (encryptedData.length < 26) { // IV (16) + datos mínimos (1) + MAC (10)
        this.logger.warn(`Datos cifrados muy pequeños: ${encryptedData.length} bytes`);
        return base64Data;
      }
      
      // Primeros bytes del archivo para diagnóstico
      const firstBytes = encryptedData.slice(0, 16).toString('hex');
      this.logger.log(`Primeros bytes del archivo: ${firstBytes}`);
      
      try {
        // Implementar el algoritmo específico de WhatsApp según la documentación oficial
        // Usar el protocolo de WhatsApp para derivar claves de cifrado y MAC
        
        // Info strings según el tipo de media
        const mediaInfoStrings = {
          'WhatsApp Audio Keys': Buffer.from('WhatsApp Audio Keys'),
          'WhatsApp Video Keys': Buffer.from('WhatsApp Video Keys'), 
          'WhatsApp Image Keys': Buffer.from('WhatsApp Image Keys'),
          'WhatsApp Document Keys': Buffer.from('WhatsApp Document Keys')
        };
        
        // Seleccionar info string apropiado
        let infoString = mediaInfoStrings['WhatsApp Audio Keys']; // Default para audio
        if (isPtt) {
          // PTT usa el mismo formato que audio normal
          infoString = mediaInfoStrings['WhatsApp Audio Keys'];
        }
        
        this.logger.log(`Usando info string: ${infoString.toString()}`);
        
        // Derivar claves usando HKDF con el protocolo de WhatsApp
        // Clave de cifrado: primeros 32 bytes
        const cipherKey = hkdf(mediaKeyBuffer, 32, {
          info: infoString,
          salt: Buffer.alloc(0), // WhatsApp usa salt vacío
          hash: 'sha256'
        });
        
        // Clave MAC: siguientes 32 bytes usando info + 0x01
        const macKey = hkdf(mediaKeyBuffer, 32, {
          info: Buffer.concat([infoString, Buffer.from([0x01])]),
          salt: Buffer.alloc(0),
          hash: 'sha256'
        });
        
        // Descomponer datos según protocolo de WhatsApp
        const iv = encryptedData.slice(0, 16);                           // IV: primeros 16 bytes
        const ciphertext = encryptedData.slice(16, encryptedData.length - 10); // Datos cifrados 
        const receivedMac = encryptedData.slice(encryptedData.length - 10);     // MAC: últimos 10 bytes
        
        this.logger.log(`IV: ${iv.toString('hex')}`);
        this.logger.log(`Ciphertext length: ${ciphertext.length}`);
        this.logger.log(`MAC recibido: ${receivedMac.toString('hex')}`);
        
        // Verificar MAC usando HMAC-SHA256
        const computedMac = crypto
          .createHmac('sha256', macKey)
          .update(Buffer.concat([iv, ciphertext]))
          .digest()
          .slice(0, 10); // WhatsApp usa solo los primeros 10 bytes
        
        this.logger.log(`MAC calculado: ${computedMac.toString('hex')}`);
        
        if (!computedMac.equals(receivedMac)) {
          this.logger.warn(`MAC no coincide, pero continuando con descifrado`);
        } else {
          this.logger.log(`MAC verificado correctamente`);
        }
        
        // Descifrar usando AES-256-CBC
        const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
        decipher.setAutoPadding(true);
        
        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        // Verificar que el resultado tiene una firma de audio válida
        if (decrypted.length > 0 && this.hasAudioSignature(decrypted)) {
          const mimeType = this.detectAudioMimeType(decrypted);
          this.logger.log(`Descifrado exitoso con protocolo WhatsApp, tipo detectado: ${mimeType}`);
          
          // Guardar archivo descifrado para diagnóstico
          const decryptedPath = path.join(this.tempDir, `whatsapp_decrypted_${Date.now()}.bin`);
          fs.writeFileSync(decryptedPath, decrypted);
          this.logger.log(`Archivo descifrado guardado: ${decryptedPath}`);
          
          return decrypted.toString('base64');
        } else {
          this.logger.warn('El descifrado no produjo un archivo de audio válido');
        }
      } catch (decryptError) {
        this.logger.error(`Error en descifrado con protocolo WhatsApp: ${decryptError.message}`);
      }
      
      // Si el descifrado oficial falla, intentar como datos sin cifrar
      this.logger.warn('Descifrado falló, verificando si los datos originales son audio sin cifrar');
      
      // Guardar datos originales para diagnóstico
      const originalPath = path.join(this.tempDir, `original_${Date.now()}.bin`);
      fs.writeFileSync(originalPath, encryptedData);
      this.logger.log(`Datos originales guardados en: ${originalPath}`);
      
      // Verificar si los datos originales son realmente audio
      if (this.hasAudioSignature(encryptedData)) {
        this.logger.log('Los datos originales parecen ser audio sin cifrar');
        return base64Data;
      }
      
      return base64Data;
    } catch (error) {
      this.logger.error(`Error al descifrar base64: ${error.message}`);
      return base64Data;
    }
  }

  // Método para determinar si un audio es de tipo PTT (Push-to-Talk)
  private isPttAudio(metadata: any): boolean {
    // Verificar el campo ptt en los metadatos
    if (metadata && metadata.ptt === true) {
      this.logger.log('Detectado mensaje de voz PTT (Push-to-Talk)');
      return true;
    }
    
    // Verificar en el mimetype
    if (metadata && metadata.mimetype && metadata.mimetype.includes('audio/ogg')) {
      this.logger.log('Detectado audio en formato OGG, posiblemente PTT');
      return true;
    }
    
    return false;
  }

  async transcribeAudio(
    audioUrl?: string,
    mediaKey?: string,
    base64Audio?: string,
    metadata?: any,
    messageId?: string,
    instanceId?: string,
    chatbotConfig?: any
  ): Promise<string> {
    console.log('🎵 *** MEDIA SERVICE - TRANSCRIBE AUDIO LLAMADO ***');
    console.log('🎵 audioUrl:', !!audioUrl);
    console.log('🎵 base64Audio:', !!base64Audio ? `${base64Audio.substring(0, 50)}...` : 'NO');
    console.log('🎵 messageId:', messageId);
    console.log('🎵 instanceId:', instanceId);
    console.log('🎵 chatbotConfig:', !!chatbotConfig);
    if (chatbotConfig) {
      console.log('🎵 aiConfig en chatbot:', !!chatbotConfig.aiConfig);
      if (chatbotConfig.aiConfig) {
        console.log('🎵 whisperApiKey disponible:', !!chatbotConfig.aiConfig.whisperApiKey);
      }
    }
    
    this.logger.log('🎵 *** TRANSCRIBE AUDIO - INICIO ***');
    try {
      this.logger.log(`🎵 Iniciando transcripción de audio`);
      this.logger.log(`🎵 Parámetros recibidos:`);
      this.logger.log(`🎵 - audioUrl: ${audioUrl ? 'Presente' : 'No presente'}`);
      this.logger.log(`🎵 - mediaKey: ${mediaKey ? 'Presente' : 'No presente'}`);
      this.logger.log(`🎵 - base64Audio: ${base64Audio ? `Presente (${base64Audio.length} caracteres)` : 'No presente'}`);
      this.logger.log(`🎵 - messageId: ${messageId || 'No presente'}`);
      this.logger.log(`🎵 - instanceId: ${instanceId || 'No presente'}`);
      this.logger.log(`🎵 - chatbotConfig: ${chatbotConfig ? 'Presente' : 'No presente'}`);

      // **DEBUG DETALLADO DE LA CONFIGURACIÓN**
      this.logger.log(`🔍 DEBUG CONFIGURACIÓN CHATBOT:`);
      this.logger.log(`🔍 - chatbotConfig existe: ${!!chatbotConfig}`);
      this.logger.log(`🔍 - chatbotConfig.aiConfig existe: ${!!(chatbotConfig && chatbotConfig.aiConfig)}`);
      
      if (chatbotConfig) {
        this.logger.log(`🔍 - Tipo de chatbotConfig: ${typeof chatbotConfig}`);
        this.logger.log(`🔍 - Keys en chatbotConfig: ${Object.keys(chatbotConfig)}`);
        
        if (chatbotConfig.aiConfig) {
          this.logger.log(`🔍 - Tipo de aiConfig: ${typeof chatbotConfig.aiConfig}`);
          this.logger.log(`🔍 - Keys en aiConfig: ${Object.keys(chatbotConfig.aiConfig)}`);
          this.logger.log(`🔍 - whisperApiKey existe: ${!!(chatbotConfig.aiConfig.whisperApiKey)}`);
          this.logger.log(`🔍 - whisperApiKey: ${chatbotConfig.aiConfig.whisperApiKey ? chatbotConfig.aiConfig.whisperApiKey.substring(0, 15) + '...' : 'NO PRESENTE'}`);
        }
      }

      // **VERIFICAR CONFIGURACIÓN DE WHISPER DEL CHATBOT**
      if (!chatbotConfig || !chatbotConfig.aiConfig) {
        this.logger.warn(`🎵 ❌ No hay configuración de AI para este chatbot`);
        this.logger.warn(`🎵 ❌ chatbotConfig: ${JSON.stringify(chatbotConfig, null, 2)}`);
        return 'Para procesar mensajes de audio, el administrador debe configurar la API de OpenAI Whisper en el panel de administración.';
      }

      const aiConfig = typeof chatbotConfig.aiConfig === 'string' 
        ? JSON.parse(chatbotConfig.aiConfig) 
        : chatbotConfig.aiConfig;

      if (!aiConfig.whisperApiKey) {
        this.logger.warn(`🎵 ❌ No hay API key de Whisper configurada para este chatbot`);
        return 'Para procesar mensajes de audio, el administrador debe configurar la API key de OpenAI Whisper.';
      }

      const whisperApiKey = aiConfig.whisperApiKey;
      const whisperUrl = aiConfig.whisperUrl || 'https://api.openai.com/v1/audio/transcriptions';

      this.logger.log(`🎵 ✅ Configuración de Whisper encontrada para el chatbot`);
      this.logger.log(`🎵 - URL: ${whisperUrl}`);
      this.logger.log(`🎵 - API Key: ${whisperApiKey.substring(0, 10)}...`);

      // **🎯 NUEVA IMPLEMENTACIÓN: COMO N8N - USAR EVOLUTION API PARA OBTENER AUDIO COMPLETO**
      if (messageId && instanceId && chatbotConfig.whatsappConfig) {
        this.logger.log(`🎵 🚀 USANDO MÉTODO N8N: Obteniendo audio completo desde Evolution API`);
        try {
          const fullAudioBase64 = await this.getFullAudioFromEvolution(messageId, instanceId, chatbotConfig.whatsappConfig);
          if (fullAudioBase64) {
            this.logger.log(`🎵 ✅ Audio completo obtenido desde Evolution API (${fullAudioBase64.length} caracteres)`);
            
            // Convertir base64 a buffer
            const audioBuffer = Buffer.from(fullAudioBase64, 'base64');
            this.logger.log(`🎵 Audio buffer creado: ${audioBuffer.length} bytes`);
            
            // Guardar temporalmente para transcripción
            const tempPath = `temp/evolution_audio_${Date.now()}.mp3`;
            fs.writeFileSync(tempPath, audioBuffer);
            this.logger.log(`🎵 Audio guardado temporalmente en: ${tempPath}`);
            
            // Transcribir con la configuración específica del chatbot
            const transcription = await this.sendWhisperRequestWithConfig(tempPath, whisperApiKey, whisperUrl);
            
            // Limpiar archivo temporal
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
            }
            
            this.logger.log(`🎵 ✅ Transcripción desde Evolution API exitosa: ${transcription}`);
            return transcription;
          } else {
            this.logger.warn(`🎵 ⚠️ No se pudo obtener audio desde Evolution API, usando método alternativo`);
          }
        } catch (error) {
          this.logger.error(`🎵 ❌ Error obteniendo audio desde Evolution API: ${error.message}`);
          this.logger.log(`🎵 🔄 Fallback: Intentando método base64 directo`);
        }
      }

      // **IMPLEMENTACIÓN ORIGINAL: PRIORIZAR BASE64 DIRECTO**
      if (base64Audio && base64Audio.length > 100) {
        this.logger.log(`🎵 ✅ Usando base64 directo del mensaje (fallback)`);
        try {
          // Limpiar el base64 de prefijos de data URL si los tiene
          let cleanBase64 = base64Audio;
          if (base64Audio.startsWith('data:')) {
            cleanBase64 = base64Audio.split(',')[1];
          }
          
          // **PASO CRÍTICO: DESENCRIPTAR SI HAY MEDIAKEY**
          if (mediaKey && mediaKey.length > 0) {
            this.logger.log(`🎵 🔑 Desencriptando audio con mediaKey (protocolo WhatsApp)`);
            const isPtt = this.isPttAudio(metadata);
            const decryptedBase64 = await this.decryptBase64(cleanBase64, mediaKey, isPtt);
            cleanBase64 = decryptedBase64;
            this.logger.log(`🎵 ✅ Audio desencriptado exitosamente`);
          } else {
            this.logger.log(`🎵 ⚠️ No hay mediaKey - asumiendo base64 sin encriptar`);
          }
          
          const audioBuffer = Buffer.from(cleanBase64, 'base64');
          this.logger.log(`🎵 Audio buffer creado: ${audioBuffer.length} bytes`);
          
          // Verificar que el audio tenga una firma válida
          if (!this.hasAudioSignature(audioBuffer)) {
            this.logger.warn(`🎵 ⚠️ El audio no tiene una firma válida, intentando de todas formas`);
          } else {
            const detectedType = this.detectAudioMimeType(audioBuffer);
            this.logger.log(`🎵 ✅ Tipo de audio detectado: ${detectedType}`);
          }
          
          // Guardar temporalmente para transcripción
          const tempPath = `temp/direct_base64_${Date.now()}.mp3`;
          fs.writeFileSync(tempPath, audioBuffer);
          this.logger.log(`🎵 Audio guardado temporalmente en: ${tempPath}`);
          
          // Transcribir con la configuración específica del chatbot
          const transcription = await this.sendWhisperRequestWithConfig(tempPath, whisperApiKey, whisperUrl);
          
          // Limpiar archivo temporal
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
          
          this.logger.log(`🎵 ✅ Transcripción exitosa: ${transcription}`);
          return transcription;
          
        } catch (error) {
          this.logger.error(`🎵 ❌ Error al procesar base64 directo: ${error.message}`);
          return 'No se pudo transcribir el audio. Verifique la configuración de la API de OpenAI.';
        }
      }

      // **MÉTODO ALTERNATIVO: Descargar desde URL**
      if (audioUrl) {
        this.logger.log(`🎵 Intentando descargar audio desde URL...`);
        try {
          const tempPath = `temp/downloaded_audio_${Date.now()}.mp3`;
          await this.downloadFile(audioUrl, tempPath, mediaKey);
          
          const transcription = await this.sendWhisperRequestWithConfig(tempPath, whisperApiKey, whisperUrl);
          
          // Limpiar archivo temporal
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
          
          this.logger.log(`🎵 ✅ Transcripción desde URL exitosa: ${transcription}`);
          return transcription;
          
        } catch (error) {
          this.logger.error(`🎵 ❌ Error descargando/transcribiendo audio desde URL: ${error.message}`);
          return 'No se pudo descargar o transcribir el audio. Verifique la configuración.';
        }
      }

      // Si no hay ni base64 ni URL
      this.logger.warn(`🎵 ❌ No hay audio base64 ni URL disponible para transcribir`);
      return 'No se recibió contenido de audio válido para transcribir.';
      
    } catch (error) {
      this.logger.error(`🎵 ❌ Error general en transcripción: ${error.message}`);
      return 'Error al procesar audio. Contacte al administrador.';
    }
  }

  /**
   * 🎯 MÉTODO INSPIRADO EN N8N: Obtener audio completo desde Evolution API
   */
  private async getFullAudioFromEvolution(messageId: string, instanceId: string, whatsappConfig: any): Promise<string | null> {
    try {
      this.logger.log(`🎵 🔗 Obteniendo audio completo desde Evolution API`);
      this.logger.log(`🎵 - MessageId: ${messageId}`);
      this.logger.log(`🎵 - InstanceId: ${instanceId}`);
      
      // Extraer configuración de WhatsApp
      const apiUrl = whatsappConfig.apiUrl;
      const apiKey = whatsappConfig.apiKey;
      const instanceName = whatsappConfig.instanceName || instanceId;
      
      if (!apiUrl || !apiKey) {
        this.logger.error(`🎵 ❌ Configuración de Evolution API incompleta`);
        return null;
      }
      
      // Construir URL para get-media-base64 (como en n8n)
      const evolutionUrl = `${apiUrl}/chat/getBase64/${instanceName}`;
      
      this.logger.log(`🎵 📡 Llamando Evolution API: ${evolutionUrl}`);
      
      const response = await axios.post(evolutionUrl, {
        message: {
          key: {
            id: messageId
          }
        },
        convertToMp4: true // Como en n8n
      }, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        timeout: 30000
      });
      
      this.logger.log(`🎵 📡 Respuesta de Evolution API:`, response.status);
      
      if (response.data && response.data.base64) {
        this.logger.log(`🎵 ✅ Base64 completo obtenido desde Evolution API`);
        return response.data.base64;
      } else if (response.data && response.data.data && response.data.data.base64) {
        this.logger.log(`🎵 ✅ Base64 completo obtenido desde Evolution API (data.data.base64)`);
        return response.data.data.base64;
      } else {
        this.logger.warn(`🎵 ⚠️ Evolution API no devolvió base64:`, response.data);
        return null;
      }
      
    } catch (error) {
      this.logger.error(`🎵 ❌ Error llamando Evolution API: ${error.message}`);
      if (error.response) {
        this.logger.error(`🎵 ❌ Status: ${error.response.status}`);
        this.logger.error(`🎵 ❌ Data: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  // Método para convertir audio a formato compatible con Whisper
  private async convertToWhisperCompatible(audioPath: string, isPtt: boolean = false): Promise<string | null> {
    try {
      if (!fs.existsSync(audioPath)) {
        this.logger.error(`Archivo de audio no existe: ${audioPath}`);
        return null;
      }
      
      const stats = fs.statSync(audioPath);
      if (stats.size === 0) {
        this.logger.error(`Archivo de audio vacío: ${audioPath}`);
        return null;
      }
      
      // Determinar el formato de salida
      const outputFormat = isPtt ? 'wav' : 'mp3';
      const outputPath = path.join(this.tempDir, `whisper_compatible_${Date.now()}.${outputFormat}`);
      
      this.logger.log(`Convirtiendo audio a formato compatible con Whisper: ${outputPath}`);
      
      // Configurar FFmpeg para convertir el audio
      const ffmpegProcess = ffmpeg(audioPath)
        .audioFrequency(16000)         // 16kHz - requerido por Whisper
        .audioChannels(1)              // Mono - mejor para reconocimiento de voz
        .audioCodec('pcm_s16le')       // PCM 16-bit para WAV
        .format(outputFormat);         // Formato de salida
      
      // Aplicar configuraciones específicas según el formato
      if (outputFormat === 'mp3') {
        ffmpegProcess.audioBitrate(128); // 128kbps para MP3
      }
      
      // Ejecutar la conversión
      await new Promise<void>((resolve, reject) => {
        ffmpegProcess
          .on('end', () => {
            this.logger.log(`Conversión exitosa: ${outputPath}`);
            resolve();
          })
          .on('error', (err) => {
            this.logger.error(`Error en conversión: ${err.message}`);
            reject(err);
          })
          .save(outputPath);
      });
      
      // Verificar que el archivo se haya creado correctamente
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 100) {
        return outputPath;
      } else {
        this.logger.warn(`El archivo convertido no existe o es demasiado pequeño: ${outputPath}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error al convertir audio: ${error.message}`);
      return null;
    }
  }

  // Obtener extensión de archivo a partir del tipo MIME
  private getMimeExtension(mimeType: string): string {
    const mimeMap: {[key: string]: string} = {
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/wave': 'wav',
      'audio/x-wav': 'wav',
      'audio/x-pn-wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/opus': 'opus',
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/aac': 'aac',
      'audio/flac': 'flac',
      'application/octet-stream': 'bin'
    };
    
    return mimeMap[mimeType] || 'bin';
  }

  // Función auxiliar para enviar a Whisper
  private async sendToWhisper(audioPath: string): Promise<string> {
    // Este método ya no debe capturar errores - dejar que se propaguen
    return await this.sendWhisperRequest(audioPath);
  }

  // Función para crear un MP3 válido simple
  private createValidMP3(): Buffer {
    // MP3 válido mínimo (header + datos)
    return Buffer.from(
      '494433030000000000544954320000000E00000054657374696E6720546F6E650054' +
      '41322000000009000000576869737065720000005452434B0000000300000031000' +
      '000434F4D4D000000130000004372656174656420666F722074657374696E67000' +
      '0000000FFFB904C00000000000000000000000000000000000000000000000000' +
      '000000000000000000000000000000000000FFFB904C000000000000000000000' +
      '00000000000000000000000000000000000000000000000000000000000000000' +
      '00FFFB904C0000000000000000000000000000000000000000000000000000000' +
      '000000000000000000000000000000000FFFB904C00000000000000000000000' +
      '0000000000000000000000000000000000000000000000000000000000000000' +
      'FFFB904C0000000000000000000000000000000000000000000000000000000' +
      '00000000000000000000000000000000000FFFB904C000000000000000000000' +
      '0000000000000000000000000000000000000000000000000000000000000000000',
      'hex'
    );
  }

  // Detectar el tipo MIME basado en la firma del archivo
  private detectAudioMimeType(buffer: Buffer): string {
    if (buffer.length < 12) return 'application/octet-stream';
    
    // Extraer los primeros bytes para analizar
    const headerBytes = buffer.slice(0, 12);
    const headerHex = headerBytes.toString('hex').toLowerCase();
    const headerStr = headerBytes.toString('ascii');
    
    // Análisis más detallado de las firmas
    // OGG: comienza con "OggS"
    if (headerStr.includes('OggS')) {
      if (buffer.indexOf('OpusHead') > -1) {
        return 'audio/opus'; // Formato OPUS en contenedor OGG (común en WhatsApp)
      }
      return 'audio/ogg';
    } 
    
    // WAV: comienza con "RIFF" y luego "WAVE"
    if (headerStr.includes('RIFF') && buffer.slice(8, 12).toString('ascii') === 'WAVE') {
      return 'audio/wav';
    } 
    
    // MP3: puede comenzar con ID3 o directamente con frame MPEG
    if (headerStr.startsWith('ID3') || (headerBytes[0] === 0xFF && (headerBytes[1] & 0xE0) === 0xE0)) {
      return 'audio/mpeg';
    } 
    
    // M4A/AAC: comienza con ftyp
    if (headerHex.includes('66747970') && (headerHex.includes('4d344120') || headerHex.includes('4d3441'))) {
      return 'audio/mp4';
    }
    
    // Si no se puede determinar el tipo, devolver tipo genérico
    return 'application/octet-stream';
  }
  
  // Función para verificar si un buffer tiene firma de archivo de audio
  private hasAudioSignature(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;
    
    // Extraer los primeros bytes para analizar
    const headerBytes = buffer.slice(0, 12);
    const headerHex = headerBytes.toString('hex').toLowerCase();
    const headerStr = headerBytes.toString('ascii');
    
    // Firmas comunes de formatos de audio
    const isOgg = headerStr.includes('OggS');
    const isOpus = buffer.indexOf('OpusHead') > -1;
    const isWav = headerStr.includes('RIFF') && headerStr.includes('WAVE');
    const isMp3 = (headerBytes[0] === 0xFF && (headerBytes[1] & 0xE0) === 0xE0) || headerStr.includes('ID3');
    const isM4a = headerHex.includes('667479704d344120') || headerHex.includes('667479704d3441');
    
    return isOgg || isOpus || isWav || isMp3 || isM4a;
  }
  
  // Método para crear respuestas de fallback según el tipo de error
  private async createFallbackAudio(errorType: string): Promise<string> {
    switch (errorType) {
      case 'archivo_no_encontrado':
        return 'No se pudo acceder al archivo de audio.';
      case 'audio_muy_corto':
        return 'El mensaje de audio es demasiado corto para ser procesado.';
      case 'formato_invalido':
        return 'El formato del audio no es compatible o el archivo está dañado.';
      case 'error_whisper':
        return 'No se pudo transcribir el mensaje de audio.';
      case 'error_verificacion':
        return 'Error al procesar el archivo de audio.';
      case 'audio_sin_voz':
        return 'El mensaje de audio no contiene voz o está vacío.';
      default:
        return 'No se pudo procesar el mensaje de audio.';
    }
  }

  /**
   * Analizar imagen usando configuración específica por chatbot con fallback a Google Vision
   * Similar al flujo de transcripción de audio
   */
  async analyzeImage(imageUrl: string, mediaKey?: string, metadata?: any, base64Image?: string, messageId?: string, instanceId?: string, chatbotConfig?: any): Promise<{ description: string, textContent: string }> {
    this.logger.log(`🖼️ Iniciando análisis de imagen`);
    this.logger.log(`🖼️ Parámetros recibidos:`);
    this.logger.log(`🖼️ - imageUrl: ${imageUrl ? 'Presente' : 'No presente'}`);
    this.logger.log(`🖼️ - mediaKey: ${mediaKey ? 'Presente' : 'No presente'}`);
    this.logger.log(`🖼️ - base64Image: ${base64Image ? `Presente (${base64Image.length} caracteres)` : 'No presente'}`);
    this.logger.log(`🖼️ - messageId: ${messageId || 'No presente'}`);
    this.logger.log(`🖼️ - instanceId: ${instanceId || 'No presente'}`);
    this.logger.log(`🖼️ - chatbotConfig: ${chatbotConfig ? 'Presente' : 'No presente'}`);
    this.logger.log(`🖼️ - caption: ${metadata?.caption || 'Sin caption'}`);

    // **VERIFICAR CONFIGURACIÓN DE GOOGLE VISION**
    let visionApiKey: string;
    let visionUrl: string;

    if (chatbotConfig?.visionApiKey) {
      this.logger.log(`🖼️ ✅ Configuración de Google Vision encontrada para el chatbot`);
      visionApiKey = chatbotConfig.visionApiKey;
      visionUrl = chatbotConfig.visionUrl || 'https://vision.googleapis.com/v1/images:annotate';
      this.logger.log(`🖼️ - URL: ${visionUrl}`);
      this.logger.log(`🖼️ - API Key: ${visionApiKey.substring(0, 10)}...`);
    } else {
      this.logger.warn(`🖼️ ❌ No hay configuración de Google Vision para este chatbot`);
      return {
        description: "🖼️ Para procesar imágenes, configure Google Vision API en el panel admin del chatbot.",
        textContent: ""
      };
    }

    try {
      let imageBuffer: Buffer;

      // **PROCESAMIENTO SEGÚN EL TIPO DE ENTRADA**
      if (base64Image) {
        this.logger.log(`🖼️ ✅ Usando base64 directo del mensaje (como n8n)`);
        
        // Desencriptar si hay mediaKey
        if (mediaKey) {
          this.logger.log(`🖼️ 🔑 Desencriptando imagen con mediaKey (protocolo WhatsApp)`);
          const decryptedBase64 = await this.decryptImageBase64(base64Image, mediaKey);
          imageBuffer = Buffer.from(decryptedBase64, 'base64');
        } else {
          this.logger.log(`🖼️ ✅ Imagen sin cifrar, procesando directamente`);
          imageBuffer = Buffer.from(base64Image, 'base64');
        }
      } else if (imageUrl) {
        this.logger.log(`🖼️ 📥 Descargando imagen desde URL...`);
        
        try {
          const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
              'User-Agent': 'WhatsApp-Bot-Image-Analyzer/1.0',
              'Accept': 'image/*,*/*'
            },
            maxContentLength: 10 * 1024 * 1024, // 10MB max
          });

          imageBuffer = Buffer.from(response.data);
          this.logger.log(`🖼️ Imagen descargada: ${imageBuffer.length} bytes`);
        } catch (downloadError) {
          this.logger.error(`🖼️ Error descargando imagen: ${downloadError.message}`);
          throw downloadError;
        }
      } else {
        throw new Error('No se proporcionó imagen (ni URL ni base64)');
      }

      // **VALIDAR Y PREPARAR IMAGEN**
      if (imageBuffer.length < 100) {
        throw new Error('Imagen demasiado pequeña');
      }

      // Guardar temporalmente para debugging
      const tempPath = `temp/vision_analysis_${Date.now()}.jpg`;
      fs.writeFileSync(tempPath, imageBuffer);
      this.logger.log(`🖼️ Imagen guardada temporalmente en: ${tempPath}`);

      // **DETERMINAR CONTEXTO Y PROMPT ESPECÍFICO**
      const analysisContext = this.determineImageAnalysisContext(metadata?.caption || '');
      this.logger.log(`🖼️ 🎯 Contexto detectado: ${analysisContext.type}`);

      // **ANALIZAR CON GOOGLE VISION API CON PROMPT ESPECÍFICO**
      this.logger.log(`🖼️ 🔍 Enviando a Google Vision API con contexto ${analysisContext.type}...`);
      
      const base64ImageData = imageBuffer.toString('base64');
            
      const requestData = {
        requests: [
          {
            image: {
              content: base64ImageData
            },
            features: [
              {
                type: "TEXT_DETECTION"
              },
              {
                type: "LABEL_DETECTION",
                maxResults: 15
              },
              {
                type: "OBJECT_LOCALIZATION",
                maxResults: 10
              },
              {
                type: "DOCUMENT_TEXT_DETECTION"
              },
              {
                type: "LOGO_DETECTION",
                maxResults: 5
              }
            ]
          }
        ]
      };

      this.logger.log(`🖼️ 🎯 URL: ${visionUrl}`);
      this.logger.log(`🖼️ 🎯 API Key: ${visionApiKey.substring(0, 10)}...`);

      const response = await axios.post(`${visionUrl}?key=${visionApiKey}`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });

      if (response.data?.responses?.[0]) {
        const visionResponse = response.data.responses[0];
        
        // **PROCESAR RESPUESTA SEGÚN EL CONTEXTO**
        return await this.processVisionResponseWithContext(visionResponse, analysisContext);
      } else {
        throw new Error('Respuesta inválida de Google Vision API');
      }
      
    } catch (error) {
      this.logger.error(`🖼️ ❌ Error en análisis de imagen: ${error.message}`);
      
      // **MANEJO DE ERRORES ESPECÍFICOS**
      if (error.response) {
        this.logger.error(`🖼️ Google Vision Status: ${error.response.status}`);
        this.logger.error(`🖼️ Google Vision Data: ${JSON.stringify(error.response.data)}`);
        
        if (error.response.status === 400) {
          return {
            description: "❌ Error: La imagen no pudo ser procesada por Google Vision. Verifica que sea un formato válido (JPG, PNG, etc.)",
            textContent: ""
          };
        } else if (error.response.status === 403) {
          return {
            description: "❌ Error: API Key de Google Vision inválida o sin permisos. Verifica la configuración en el panel admin.",
            textContent: ""
          };
        }
      }
      
      return {
        description: "❌ No se pudo analizar la imagen. Por favor, intenta enviar la imagen nuevamente.",
        textContent: ""
      };
    }
  }

  /**
   * Determinar el contexto de análisis según el caption y mensaje
   */
  private determineImageAnalysisContext(caption: string = ''): any {
    const captionLower = caption.toLowerCase();
    
    // **CONTEXTO: LISTA DE COMPRAS**
    if (captionLower.includes('lista') || captionLower.includes('compra') || 
        captionLower.includes('necesito') || captionLower.includes('quiero')) {
      return {
        type: 'shopping_list',
        prompt: 'Extraer productos de una lista de compras',
        focus: ['productos', 'cantidades', 'marcas', 'precios']
      };
    }
    
    // **CONTEXTO: FACTURA O PAGO**
    if (captionLower.includes('factura') || captionLower.includes('recibo') || 
        captionLower.includes('pago') || captionLower.includes('transferencia') ||
        captionLower.includes('comprobante')) {
      return {
        type: 'payment_receipt',
        prompt: 'Extraer información de pago o factura',
        focus: ['monto', 'fecha', 'referencia', 'banco', 'productos', 'total']
      };
    }
    
    // **CONTEXTO: PRODUCTO ESPECÍFICO**
    if (captionLower.includes('producto') || captionLower.includes('precio') ||
        captionLower.includes('marca') || captionLower.includes('etiqueta')) {
      return {
        type: 'product_info',
        prompt: 'Extraer información detallada de producto',
        focus: ['nombre', 'marca', 'precio', 'contenido', 'ingredientes', 'código']
      };
    }
    
    // **CONTEXTO: MENÚ O CATÁLOGO**
    if (captionLower.includes('menú') || captionLower.includes('catálogo') ||
        captionLower.includes('ofertas') || captionLower.includes('promoción')) {
      return {
        type: 'catalog_menu',
        prompt: 'Extraer productos y precios de catálogo',
        focus: ['productos', 'precios', 'ofertas', 'categorías']
      };
    }
    
    // **CONTEXTO: GENERAL (por defecto)**
    return {
      type: 'general',
      prompt: 'Análisis general de imagen',
      focus: ['texto', 'objetos', 'contenido']
    };
  }

  /**
   * Procesar respuesta de Vision API según el contexto específico
   */
  private async processVisionResponseWithContext(visionResponse: any, context: any): Promise<{ description: string, textContent: string }> {
    this.logger.log(`🖼️ 🧠 Procesando respuesta con contexto: ${context.type}`);
    
    // **EXTRAER TEXTO DETECTADO**
    let textContent = '';
    if (visionResponse.textAnnotations && visionResponse.textAnnotations.length > 0) {
      textContent = visionResponse.textAnnotations[0].description || '';
      this.logger.log(`🖼️ ✅ Texto detectado: "${textContent.substring(0, 100)}..."`);
    }
    
    // Si no hay texto en textAnnotations, intentar con fullTextAnnotation
    if (!textContent && visionResponse.fullTextAnnotation?.text) {
      textContent = visionResponse.fullTextAnnotation.text;
      this.logger.log(`🖼️ ✅ Texto de documento detectado: "${textContent.substring(0, 100)}..."`);
    }

    // **EXTRAER LABELS Y OBJETOS**
    const labels = visionResponse.labelAnnotations || [];
    const objects = visionResponse.localizedObjectAnnotations || [];
    const logos = visionResponse.logoAnnotations || [];

    // **PROCESAR SEGÚN EL CONTEXTO ESPECÍFICO**
    switch (context.type) {
      case 'shopping_list':
        return this.processShoppingListImage(textContent, labels, objects, logos);
        
      case 'payment_receipt':
        return this.processPaymentReceiptImage(textContent, labels, objects);
        
      case 'product_info':
        return this.processProductInfoImage(textContent, labels, objects, logos);
        
      case 'catalog_menu':
        return this.processCatalogMenuImage(textContent, labels, objects);
        
      default:
        return this.processGeneralImage(textContent, labels, objects, logos);
    }
  }

  /**
   * Procesar imagen de lista de compras
   */
  private processShoppingListImage(textContent: string, labels: any[], objects: any[], logos: any[]): { description: string, textContent: string } {
    this.logger.log(`🛒 Procesando lista de compras`);
    
    // Extraer productos del texto usando patrones comunes
    const products = this.extractProductsFromText(textContent);
    const quantities = this.extractQuantitiesFromText(textContent);
    
    let description = `🛒 **LISTA DE COMPRAS DETECTADA** 🛒\n`;
    description += `📝 Se encontraron ${products.length} productos en la lista.\n\n`;
    
    if (products.length > 0) {
      description += `📋 **PRODUCTOS IDENTIFICADOS:**\n`;
      products.slice(0, 10).forEach((product, index) => {
        const quantity = quantities[index] || '1';
        description += `• ${quantity} ${product}\n`;
      });
      
      if (products.length > 10) {
        description += `... y ${products.length - 10} productos más.\n`;
      }
    }
    
    // Agregar categorías detectadas
    const foodLabels = labels.filter(label => 
      ['Food', 'Grocery', 'Ingredient', 'Produce', 'Dairy', 'Meat', 'Beverage'].includes(label.description)
    );
    
    if (foodLabels.length > 0) {
      description += `\n🏷️ **CATEGORÍAS:** ${foodLabels.map(l => l.description).join(', ')}\n`;
    }
    
    description += `\n💡 **¿Quiere buscar estos productos?** Puedo ayudarle a encontrar precios y disponibilidad.`;
    
    return { description, textContent };
  }

  /**
   * Procesar imagen de comprobante de pago
   */
  private processPaymentReceiptImage(textContent: string, labels: any[], objects: any[]): { description: string, textContent: string } {
    this.logger.log(`💳 Procesando comprobante de pago`);
    
    // Extraer información de pago del texto
    const paymentInfo = this.extractPaymentInfoFromText(textContent);
    
    let description = `💳 **COMPROBANTE DE PAGO DETECTADO** 💳\n`;
    
    if (paymentInfo.amount) {
      description += `💰 **Monto:** ${paymentInfo.amount}\n`;
    }
    
    if (paymentInfo.reference) {
      description += `🔢 **Referencia:** ${paymentInfo.reference}\n`;
    }
    
    if (paymentInfo.date) {
      description += `📅 **Fecha:** ${paymentInfo.date}\n`;
    }
    
    if (paymentInfo.bank) {
      description += `🏦 **Banco:** ${paymentInfo.bank}\n`;
    }
    
    if (paymentInfo.concept) {
      description += `📝 **Concepto:** ${paymentInfo.concept}\n`;
    }
    
    description += `\n✅ **Comprobante registrado.** ¿Necesita ayuda con la validación del pago?`;
    
    return { description, textContent };
  }

  /**
   * Procesar imagen de información de producto
   */
  private processProductInfoImage(textContent: string, labels: any[], objects: any[], logos: any[]): { description: string, textContent: string } {
    this.logger.log(`🏷️ Procesando información de producto`);
    
    const productInfo = this.extractProductDetailsFromText(textContent);
    
    let description = `🏷️ **PRODUCTO IDENTIFICADO** 🏷️\n`;
    
    // Agregar logos detectados
    if (logos.length > 0) {
      description += `🏢 **Marca:** ${logos[0].description}\n`;
    }
    
    if (productInfo.name) {
      description += `📦 **Producto:** ${productInfo.name}\n`;
    }
    
    if (productInfo.price) {
      description += `💰 **Precio:** ${productInfo.price}\n`;
    }
    
    if (productInfo.weight || productInfo.volume) {
      description += `⚖️ **Contenido:** ${productInfo.weight || productInfo.volume}\n`;
    }
    
    if (productInfo.barcode) {
      description += `📊 **Código:** ${productInfo.barcode}\n`;
    }
    
    // Agregar categorías más relevantes
    const relevantLabels = labels.filter(label => label.score > 0.7).slice(0, 5);
    if (relevantLabels.length > 0) {
      description += `🏷️ **Categorías:** ${relevantLabels.map(l => `${l.description} (${Math.round(l.score * 100)}%)`).join(', ')}\n`;
    }
    
    description += `\n🔍 **¿Buscar productos similares o verificar precios?**`;
    
    return { description, textContent };
  }

  /**
   * Procesar imagen de catálogo o menú
   */
  private processCatalogMenuImage(textContent: string, labels: any[], objects: any[]): { description: string, textContent: string } {
    this.logger.log(`📋 Procesando catálogo/menú`);
    
    const menuItems = this.extractMenuItemsFromText(textContent);
    
    let description = `📋 **CATÁLOGO/MENÚ DETECTADO** 📋\n`;
    description += `🛍️ Se encontraron ${menuItems.length} productos con precios.\n\n`;
    
    if (menuItems.length > 0) {
      description += `💰 **PRODUCTOS Y PRECIOS:**\n`;
      menuItems.slice(0, 8).forEach((item, index) => {
        description += `${index + 1}. ${item.name} - ${item.price}\n`;
      });
      
      if (menuItems.length > 8) {
        description += `... y ${menuItems.length - 8} productos más.\n`;
      }
    }
    
    description += `\n🛒 **¿Desea agregar algún producto al carrito?** Indique el número del producto.`;
    
    return { description, textContent };
  }

  /**
   * Procesar imagen general
   */
  private processGeneralImage(textContent: string, labels: any[], objects: any[], logos: any[]): { description: string, textContent: string } {
    let description = '🖼️ **IMAGEN ANALIZADA CON GOOGLE VISION** 🖼️\n';
    
    // Agregar logos si los hay
    if (logos.length > 0) {
      description += `🏢 **Marcas detectadas:** ${logos.map(logo => logo.description).join(', ')}\n`;
    }
    
    // Agregar labels principales
    if (labels.length > 0) {
      const topLabels = labels
        .slice(0, 5)
        .map(label => `${label.description} (${Math.round(label.score * 100)}%)`)
        .join(', ');
      description += `🏷️ **Contenido detectado:** ${topLabels}\n`;
    }

    // Agregar objetos si los hay
    if (objects.length > 0) {
      const topObjects = objects
        .slice(0, 3)
        .map(obj => `${obj.name} (${Math.round(obj.score * 100)}%)`)
        .join(', ');
      description += `📦 **Objetos principales:** ${topObjects}\n`;
    }

    if (textContent) {
      description += `📝 **Texto visible en la imagen.**`;
    } else {
      description += `📝 **Sin texto visible.**`;
    }
    
    return { description, textContent };
  }

  /**
   * Extraer productos del texto usando patrones
   */
  private extractProductsFromText(text: string): string[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const products: string[] = [];
    
    for (const line of lines) {
      // Patrones comunes de productos
      const cleanLine = line.trim()
        .replace(/^[-•*]\s*/, '') // Remover bullets
        .replace(/^\d+[\.)]\s*/, '') // Remover números
        .replace(/\d+\s*(kg|g|ml|l|unidades?|piezas?)\s*/gi, '') // Remover cantidades
        .trim();
      
      if (cleanLine.length > 2 && cleanLine.length < 50) {
        products.push(cleanLine);
      }
    }
    
    return products;
  }

  /**
   * Extraer cantidades del texto
   */
  private extractQuantitiesFromText(text: string): string[] {
    const lines = text.split('\n');
    const quantities: string[] = [];
    
    for (const line of lines) {
      const quantityMatch = line.match(/(\d+)\s*(kg|g|ml|l|unidades?|piezas?|u\b)/i);
      if (quantityMatch) {
        quantities.push(`${quantityMatch[1]} ${quantityMatch[2]}`);
      } else {
        quantities.push('1');
      }
    }
    
    return quantities;
  }

  /**
   * Extraer información de pago del texto
   */
  private extractPaymentInfoFromText(text: string): any {
    const paymentInfo: any = {};
    
    // Buscar montos
    const amountMatch = text.match(/(?:monto|total|cantidad)[:\s]*\$?([0-9,]+\.?\d*)/i) ||
                       text.match(/\$\s*([0-9,]+\.?\d*)/i) ||
                       text.match(/([0-9,]+\.?\d*)\s*(?:bs|bolívares|usd|dólares)/i);
    if (amountMatch) {
      paymentInfo.amount = amountMatch[1];
    }
    
    // Buscar referencia
    const refMatch = text.match(/(?:ref|referencia|número)[:\s]*(\w+)/i);
    if (refMatch) {
      paymentInfo.reference = refMatch[1];
    }
    
    // Buscar fecha
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (dateMatch) {
      paymentInfo.date = dateMatch[1];
    }
    
    // Buscar banco
    const bankMatch = text.match(/(banco|banesco|mercantil|venezuela|provincial|exterior|plaza|bicentenario)/i);
    if (bankMatch) {
      paymentInfo.bank = bankMatch[1];
    }
    
    return paymentInfo;
  }

  /**
   * Extraer detalles de producto del texto
   */
  private extractProductDetailsFromText(text: string): any {
    const productInfo: any = {};
    
    // Buscar precio
    const priceMatch = text.match(/\$\s*([0-9,]+\.?\d*)|([0-9,]+\.?\d*)\s*(?:bs|bolívares|usd|dólares)/i);
    if (priceMatch) {
      productInfo.price = priceMatch[1] || priceMatch[2];
    }
    
    // Buscar peso/volumen
    const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|oz|lb)/i);
    if (weightMatch) {
      productInfo.weight = `${weightMatch[1]} ${weightMatch[2]}`;
    }
    
    // Buscar código de barras
    const barcodeMatch = text.match(/(\d{8,14})/);
    if (barcodeMatch) {
      productInfo.barcode = barcodeMatch[1];
    }
    
    // El nombre del producto será la línea más prominente
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      productInfo.name = lines[0].trim();
    }
    
    return productInfo;
  }

  /**
   * Extraer elementos de menú con precios
   */
  private extractMenuItemsFromText(text: string): any[] {
    const lines = text.split('\n');
    const menuItems: any[] = [];
    
    for (const line of lines) {
      // Buscar líneas con formato "Producto ... Precio"
      const menuMatch = line.match(/^(.+?)\s*\.{2,}\s*\$?([0-9,]+\.?\d*)/i) ||
                       line.match(/^(.+?)\s+-\s*\$?([0-9,]+\.?\d*)/i) ||
                       line.match(/^(.+?)\s*\$([0-9,]+\.?\d*)/i);
      
      if (menuMatch) {
        menuItems.push({
          name: menuMatch[1].trim(),
          price: `$${menuMatch[2]}`
        });
      }
    }
    
    return menuItems;
  }

  /**
   * Descifrar imagen de WhatsApp usando mediaKey
   */
  private async decryptImageBase64(base64Data: string, mediaKey: string): Promise<string> {
    try {
      this.logger.log('🖼️ 🔐 Descifrando imagen de WhatsApp...');
      
      // Verificar que tengamos datos válidos
      if (!base64Data || !mediaKey) {
        this.logger.warn('🖼️ Datos base64 o mediaKey vacíos para imagen');
        return base64Data;
      }
      
      // Convertir mediaKey de base64 a buffer
      const mediaKeyBuffer = Buffer.from(mediaKey, 'base64');
      
      // Verificación de la media key
      if (mediaKeyBuffer.length !== 32) {
        this.logger.warn(`🖼️ Media key con longitud inválida: ${mediaKeyBuffer.length}, se esperan 32 bytes`);
        return base64Data;
      }
      
      // Decodificar los datos base64
      const encryptedData = Buffer.from(base64Data, 'base64');
      
      if (encryptedData.length < 26) { // IV (16) + datos mínimos (1) + MAC (10)
        this.logger.warn(`🖼️ Datos cifrados muy pequeños: ${encryptedData.length} bytes`);
        return base64Data;
      }
      
      try {
        // Usar el info string específico para imágenes de WhatsApp
        const infoString = Buffer.from('WhatsApp Image Keys');
        
        this.logger.log(`🖼️ Usando info string para imagen: ${infoString.toString()}`);
        
        // Derivar claves usando HKDF con el protocolo de WhatsApp
        const cipherKey = hkdf(mediaKeyBuffer, 32, {
          info: infoString,
          salt: Buffer.alloc(0), // WhatsApp usa salt vacío
          hash: 'sha256'
        });
        
        // Clave MAC: siguientes 32 bytes usando info + 0x01
        const macKey = hkdf(mediaKeyBuffer, 32, {
          info: Buffer.concat([infoString, Buffer.from([0x01])]),
          salt: Buffer.alloc(0),
          hash: 'sha256'
        });
        
        // Descomponer datos según protocolo de WhatsApp
        const iv = encryptedData.slice(0, 16);                           // IV: primeros 16 bytes
        const ciphertext = encryptedData.slice(16, encryptedData.length - 10); // Datos cifrados 
        const receivedMac = encryptedData.slice(encryptedData.length - 10);     // MAC: últimos 10 bytes
        
        // Verificar MAC usando HMAC-SHA256
        const computedMac = crypto
          .createHmac('sha256', macKey)
          .update(Buffer.concat([iv, ciphertext]))
          .digest()
          .slice(0, 10); // WhatsApp usa solo los primeros 10 bytes
        
        if (!computedMac.equals(receivedMac)) {
          this.logger.warn(`🖼️ MAC no coincide para imagen, pero continuando con descifrado`);
        } else {
          this.logger.log(`🖼️ MAC verificado correctamente para imagen`);
        }
        
        // Descifrar usando AES-256-CBC
        const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
        decipher.setAutoPadding(true);
        
        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        // Verificar que el resultado tiene una firma de imagen válida
        if (decrypted.length > 0 && this.isValidImageBuffer(decrypted)) {
          this.logger.log(`🖼️ ✅ Descifrado exitoso de imagen con protocolo WhatsApp`);
          return decrypted.toString('base64');
        } else {
          this.logger.warn('🖼️ El descifrado no produjo una imagen válida');
        }
      } catch (decryptError) {
        this.logger.error(`🖼️ Error en descifrado de imagen con protocolo WhatsApp: ${decryptError.message}`);
      }
      
      // Si el descifrado falla, devolver datos originales
      this.logger.warn('🖼️ Descifrado de imagen falló, usando datos originales');
      return base64Data;
    } catch (error) {
      this.logger.error(`🖼️ Error al descifrar imagen base64: ${error.message}`);
      return base64Data;
    }
  }

  /**
   * Verificar si un buffer tiene un header de imagen válido
   */
  private hasValidImageHeader(buffer: Buffer): boolean {
    if (buffer.length < 10) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return true;
    }
    
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return true;
    }
    
    // GIF: 47 49 46
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return true;
    }
    
    // WebP: RIFF...WEBP
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return true;
    }

    // Verificar por string JFIF (común en JPEG)
    const headerStr = buffer.slice(0, 20).toString('ascii');
    if (headerStr.includes('JFIF') || headerStr.includes('Exif')) {
      return true;
    }

    return false;
  }

  /**
   * Buscar el índice donde comienza un header JPEG válido
   */
  private findJpegHeader(buffer: Buffer): number {
    // Buscar la secuencia FF D8 FF que indica el inicio de un JPEG
    for (let i = 0; i < buffer.length - 3; i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8 && buffer[i + 2] === 0xFF) {
        return i;
      }
    }
    
    // Buscar por string JFIF
    const bufferStr = buffer.toString('ascii');
    const jfifIndex = bufferStr.indexOf('JFIF');
    if (jfifIndex > 0) {
      // JFIF usualmente está precedido por algunos bytes, buscar FF D8 antes
      for (let i = Math.max(0, jfifIndex - 10); i < jfifIndex; i++) {
        if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
          return i;
        }
      }
    }
    
    return -1;
  }

  /**
   * Obtener imagen descifrada usando Evolution API (desde tu servidor)
   */
  private async getDecryptedImageFromEvolution(messageId: string, instanceId: string): Promise<string | null> {
    try {
      this.logger.log(`🖼️ 🔑 Obteniendo imagen descifrada de Evolution API...`);
      
      // URL para obtener media descifrada (desde configuración)
      const evolutionUrl = this.configService.get<string>('evolution.url') || 
                           this.configService.get<string>('EVOLUTION_API_URL') || 
                           'http://api.zemog.info'; // Usar la URL configurada
      const evolutionApiKey = this.configService.get<string>('evolution.apiKey') || 
                              this.configService.get<string>('EVOLUTION_API_KEY') ||
                              this.apiKey;
      
      // Endpoints comunes de Evolution API para media base64
      const possibleEndpoints = [
        `/message/base64/${instanceId}/${messageId}`,
        `/message/${instanceId}/base64/${messageId}`, 
        `/chat/${instanceId}/media/${messageId}`,
        `/media/base64/${instanceId}/${messageId}`,
        `/${instanceId}/message/base64/${messageId}`
      ];
      
      this.logger.log(`🖼️ URL Evolution configurada: ${evolutionUrl}`);
      this.logger.log(`🖼️ API Key Evolution: ${evolutionApiKey ? 'Configurada' : 'No configurada'}`);
      
      // Intentar cada endpoint hasta encontrar uno que funcione
      for (const endpoint of possibleEndpoints) {
        const url = `${evolutionUrl}${endpoint}`;
        this.logger.log(`🖼️ Probando endpoint: ${url}`);
        
        try {
          // Probar con GET primero
          const response = await axios.get(url, {
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            timeout: 15000
          });

          if (response.data?.base64) {
            this.logger.log(`🖼️ ✅ Base64 descifrado obtenido de Evolution API (GET ${endpoint})`);
            return response.data.base64;
          }
        } catch (getError) {
          this.logger.warn(`🖼️ GET ${endpoint} falló: ${getError.response?.status || getError.message}`);
          
          // Si GET falla, probar con POST
          try {
            const postData = {
              messageId: messageId,
              instanceId: instanceId
            };

            const postResponse = await axios.post(url, postData, {
              headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionApiKey
              },
              timeout: 15000
            });

            if (postResponse.data?.base64) {
              this.logger.log(`🖼️ ✅ Base64 descifrado obtenido de Evolution API (POST ${endpoint})`);
              return postResponse.data.base64;
            }
          } catch (postError) {
            this.logger.warn(`🖼️ POST ${endpoint} falló: ${postError.response?.status || postError.message}`);
          }
        }
      }

      this.logger.warn(`🖼️ ⚠️ Ningún endpoint de Evolution API funcionó`);
      return null;

    } catch (error) {
      this.logger.error(`🖼️ Error general en Evolution API: ${error.message}`);
      return null;
    }
  }

  /**
   * Verificar si el buffer contiene una imagen válida
   */
  private isValidImageBuffer(buffer: Buffer): boolean {
    if (buffer.length < 10) {
      this.logger.warn(`🖼️ Buffer muy pequeño: ${buffer.length} bytes`);
      return false;
    }

    // Log los primeros bytes para debugging
    const firstBytes = buffer.slice(0, 16).toString('hex');
    this.logger.log(`🖼️ Primeros bytes del buffer: ${firstBytes}`);

    // Verificar signatures de diferentes formatos de imagen
    const signatures = {
      jpg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46],
      webp: [0x52, 0x49, 0x46, 0x46], // RIFF (WebP también usa esto)
      bmp: [0x42, 0x4D]
    };

    for (const [format, signature] of Object.entries(signatures)) {
      if (signature.every((byte, index) => buffer[index] === byte)) {
        this.logger.log(`🖼️ ✅ Formato de imagen detectado: ${format}`);
        return true;
      }
    }

    // **VALIDACIÓN MÁS PERMISIVA**: Si no coincide con signatures exactas,
    // verificar si al menos parece contenido binario de imagen válido
    const isLikelyImage = this.isLikelyImageContent(buffer);
    if (isLikelyImage) {
      this.logger.log(`🖼️ ✅ Parece ser contenido de imagen válido (validación permisiva)`);
      return true;
    }

    this.logger.warn(`🖼️ ❌ Buffer no parece ser una imagen válida`);
    return false;
  }

  /**
   * Verificación más permisiva para contenido de imagen
   */
  private isLikelyImageContent(buffer: Buffer): boolean {
    if (buffer.length < 100) return false;

    // Verificar que no sea solo texto
    const textChars = buffer.slice(0, 100).toString('ascii').replace(/[^\w\s]/g, '');
    if (textChars.length > 80) {
      // Si más del 80% son caracteres de texto, probablemente no es una imagen
      return false;
    }

    // Verificar distribución de bytes (las imágenes tienen distribución más variada)
    const byteDistribution = new Set(buffer.slice(0, 100));
    if (byteDistribution.size < 20) {
      // Si hay muy poca variedad de bytes, probablemente no es una imagen
      return false;
    }

    // Si pasa estas verificaciones básicas, aceptar como imagen válida
    return true;
  }

  /**
   * Analizar imagen usando Google Vision API (método de fallback)
   */
  private async analyzeImageWithGoogleVision(imageBuffer: Buffer): Promise<{ description: string, textContent: string }> {
    try {
      this.logger.log(`🖼️ 📱 Analizando imagen con Google Vision API (${imageBuffer.length} bytes)`);

      // Convertir imagen a base64
      const base64Image = imageBuffer.toString('base64');

      // URL de Google Vision API
      const googleVisionUrl = 'https://vision.googleapis.com/v1/images:annotate';
      
      // API Key de Google (desde configuración)
      const googleApiKey = this.configService.get<string>('GOOGLE_VISION_API_KEY') || 
                           this.configService.get<string>('google.visionApiKey') ||
                           'AIzaSyAfvE-ZPTz3NRct_fqELgQ0zH5y6PIUvdw'; // Fallback

      // Payload como en el ejemplo de n8n
      const requestData = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: "TEXT_DETECTION"
              },
              {
                type: "LABEL_DETECTION",
                maxResults: 10
              },
              {
                type: "OBJECT_LOCALIZATION",
                maxResults: 5
              }
            ]
          }
        ]
      };

      this.logger.log(`🖼️ Enviando a Google Vision API...`);

      const response = await axios.post(`${googleVisionUrl}?key=${googleApiKey}`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      if (response.data?.responses?.[0]) {
        const visionResponse = response.data.responses[0];
        
        // Extraer texto detectado
        let textContent = '';
        if (visionResponse.textAnnotations && visionResponse.textAnnotations.length > 0) {
          textContent = visionResponse.textAnnotations[0].description || '';
          this.logger.log(`🖼️ ✅ Texto detectado: "${textContent.substring(0, 100)}..."`);
        }

        // Extraer labels/objetos para descripción
        let description = 'Imagen analizada con Google Vision. ';
        
        if (visionResponse.labelAnnotations && visionResponse.labelAnnotations.length > 0) {
          const labels = visionResponse.labelAnnotations
            .slice(0, 5)
            .map(label => label.description)
            .join(', ');
          description += `Objetos detectados: ${labels}. `;
        }

        if (visionResponse.localizedObjectAnnotations && visionResponse.localizedObjectAnnotations.length > 0) {
          const objects = visionResponse.localizedObjectAnnotations
            .slice(0, 3)
            .map(obj => obj.name)
            .join(', ');
          description += `Elementos principales: ${objects}. `;
        }

        if (textContent) {
          description += `Texto visible en la imagen.`;
        } else {
          description += `Sin texto visible.`;
        }

        return {
          description: description,
          textContent: textContent
        };
      } else {
        throw new Error('Respuesta inválida de Google Vision API');
      }

    } catch (error) {
      this.logger.error(`🖼️ Error en Google Vision: ${error.message}`);
      
      if (error.response) {
        this.logger.error(`🖼️ Google Vision Status: ${error.response.status}`);
        this.logger.error(`🖼️ Google Vision Data: ${JSON.stringify(error.response.data)}`);
        
        if (error.response.status === 400 && error.response.data?.error?.message?.includes('API key expired')) {
          throw new Error('Google Vision API key expirada. Necesitas renovar la API key.');
        }
      }
      
      throw new Error(`Error del servicio Google Vision: ${error.message}`);
    }
  }

  /**
   * Intentar reparar o convertir imagen corrupta
   */
  private repairImageBuffer(buffer: Buffer): Buffer {
    try {
      // Si la imagen está corrupta, intentar encontrar el header JPEG válido
      const jpegHeaderIndex = this.findJpegHeader(buffer);
      
      if (jpegHeaderIndex > 0) {
        this.logger.log(`🖼️ 🔧 Encontrado header JPEG en posición ${jpegHeaderIndex}, extrayendo imagen válida`);
        return buffer.slice(jpegHeaderIndex);
      }
      
      // Si no encontramos header válido, verificar si hay datos al final
      if (buffer.length > 1000) {
        // Intentar desde diferentes posiciones
        for (let i = 0; i < Math.min(buffer.length, 1000); i += 10) {
          if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8 && buffer[i + 2] === 0xFF) {
            this.logger.log(`🖼️ 🔧 Encontrado posible header JPEG en posición ${i}`);
            return buffer.slice(i);
          }
        }
      }
      
      this.logger.warn(`🖼️ ⚠️ No se pudo reparar la imagen, usando buffer original`);
      return buffer;
    } catch (error) {
      this.logger.error(`🖼️ Error reparando imagen: ${error.message}`);
      return buffer;
    }
  }

  /**
   * Validar y preparar imagen para OpenAI Vision
   */
  private validateAndPrepareImageForOpenAI(imageBuffer: Buffer): Buffer {
    this.logger.log(`🖼️ 🔍 Validando imagen para OpenAI (${imageBuffer.length} bytes)`);
    
    // Verificar tamaño mínimo
    if (imageBuffer.length < 100) {
      throw new Error('Imagen demasiado pequeña');
    }
    
    // Verificar tamaño máximo (20MB para OpenAI)
    if (imageBuffer.length > 20 * 1024 * 1024) {
      throw new Error('Imagen demasiado grande para OpenAI Vision');
    }
    
    // Verificar si tiene header válido
    if (!this.hasValidImageHeader(imageBuffer)) {
      this.logger.warn(`🖼️ ⚠️ Header de imagen inválido, intentando reparar...`);
      imageBuffer = this.repairImageBuffer(imageBuffer);
      
      // Verificar nuevamente después de la reparación
      if (!this.hasValidImageHeader(imageBuffer)) {
        throw new Error('No se pudo reparar la imagen corrupta');
      }
    }
    
    // Log los primeros bytes para debugging
    const firstBytes = imageBuffer.slice(0, 16).toString('hex');
    this.logger.log(`🖼️ ✅ Imagen válida - primeros bytes: ${firstBytes}`);
    
    return imageBuffer;
  }

  // Función para enviar la solicitud a Whisper (compatibilidad - usa configuración global)
  private async sendWhisperRequest(audioPath: string): Promise<string> {
    return await this.sendWhisperRequestWithConfig(
      audioPath, 
      this.apiKey || this.configService.get<string>('OPENAI_API_KEY'), 
      this.whisperUrl || 'https://api.openai.com/v1/audio/transcriptions'
    );
  }

  async uploadFile(file: Express.Multer.File): Promise<{ url: string }> {
    try {
      if (!file) {
        throw new Error('No se ha proporcionado ningún archivo');
      }

      // Validar tipo de archivo
      if (!this.allowedTypes.includes(file.mimetype)) {
        throw new Error('Tipo de archivo no permitido');
      }

      // Generar URL del archivo
      const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3001';
      const url = `${baseUrl}/uploads/${file.filename}`;

      this.logger.log(`Archivo subido exitosamente: ${url}`);
      return { url };
    } catch (error) {
      this.logger.error(`Error al subir archivo: ${error.message}`);
      throw error;
    }
  }

  getAllowedTypes(): string[] {
    return this.allowedTypes;
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, fileName);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        throw new Error('Archivo no encontrado');
      }

      // Eliminar archivo
      await fs.promises.unlink(filePath);
      this.logger.log(`Archivo eliminado exitosamente: ${fileName}`);
    } catch (error) {
      this.logger.error(`Error al eliminar archivo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Método para extraer audios de WhatsApp que están en formato OPUS
   * (Audio Push-to-Talk de WhatsApp)
   */
  private async extractAudioFromWhatsAppOgg(audioPath: string): Promise<string | null> {
    try {
      this.logger.log('Intentando extraer audio OPUS de contenedor OGG de WhatsApp');
      
      // Crear un archivo OPUS específicamente para Whisper
      const opusPath = path.join(this.tempDir, `whatsapp_opus_${Date.now()}.opus`);
      
      // Usar ffmpeg para extraer solo el stream de audio sin recodificar
      await new Promise<void>((resolve, reject) => {
        ffmpeg(audioPath)
          .outputOptions('-c:a', 'copy')  // Copiar stream sin recodificar
          .output(opusPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      
      if (fs.existsSync(opusPath) && fs.statSync(opusPath).size > 100) {
        this.logger.log(`Audio OPUS extraído correctamente: ${opusPath}`);
        return opusPath;
      } else {
        this.logger.warn('No se pudo extraer audio OPUS válido');
        return null;
      }
    } catch (error) {
      this.logger.error(`Error al extraer audio OPUS: ${error.message}`);
      return null;
    }
  }

  // Función para crear un archivo WAV con silencio
  private createSilentWavFile(): Buffer {
    try {
      // Parámetros para un archivo WAV compatible con Whisper
      const sampleRate = 16000;    // 16kHz (requerido por Whisper)
      const channels = 1;          // Mono
      const duration = 1;          // 1 segundo de duración
      const bitDepth = 16;         // 16 bits por muestra (PCM)
      
      // Calcular el número total de muestras
      const numSamples = sampleRate * duration * channels;
      
      // Crear buffer para las muestras (todas en cero = silencio)
      const samples = new Float32Array(numSamples);
      
      // Crear cabecera WAV
      const buffer = Buffer.alloc(44 + (numSamples * 2)); // 44 bytes de cabecera + 2 bytes por muestra
      
      // RIFF header
      buffer.write('RIFF', 0);                          // ChunkID
      buffer.writeUInt32LE(36 + numSamples * 2, 4);     // ChunkSize (4 + (8 + SubChunk1Size) + (8 + SubChunk2Size))
      buffer.write('WAVE', 8);                          // Format
      
      // fmt subchunk
      buffer.write('fmt ', 12);                         // Subchunk1ID
      buffer.writeUInt32LE(16, 16);                     // Subchunk1Size (16 para PCM)
      buffer.writeUInt16LE(1, 20);                      // AudioFormat (1 para PCM)
      buffer.writeUInt16LE(channels, 22);               // NumChannels
      buffer.writeUInt32LE(sampleRate, 24);             // SampleRate
      buffer.writeUInt32LE(sampleRate * channels * bitDepth/8, 28); // ByteRate
      buffer.writeUInt16LE(channels * bitDepth/8, 32);  // BlockAlign
      buffer.writeUInt16LE(bitDepth, 34);               // BitsPerSample
      
      // data subchunk
      buffer.write('data', 36);                         // Subchunk2ID
      buffer.writeUInt32LE(numSamples * bitDepth/8, 40); // Subchunk2Size
      
      // Escribir muestras de silencio (ceros)
      for (let i = 0; i < numSamples; i++) {
        buffer.writeInt16LE(0, 44 + i * 2);
      }
      
      // Agregar un tono suave para asegurarnos que Whisper detecte el archivo como válido
      // Un tono de 440Hz durante los primeros 100ms
      const frequency = 440;
      const amplitude = 100; // Valor bajo para que sea casi silencioso
      for (let i = 0; i < sampleRate * 0.1; i++) {
        const value = Math.floor(amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate));
        buffer.writeInt16LE(value, 44 + i * 2);
      }
      
      this.logger.log(`Archivo WAV creado correctamente: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      this.logger.error(`Error al crear WAV: ${error.message}`);
      
      // En caso de error, devolver un WAV minimalista pero válido
      const minimalWav = Buffer.from([
        // RIFF header
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // Chunk size (36 bytes)
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        
        // fmt subchunk
        0x66, 0x6d, 0x74, 0x20, // "fmt "
        0x10, 0x00, 0x00, 0x00, // Subchunk1Size (16 bytes)
        0x01, 0x00,             // AudioFormat (1 = PCM)
        0x01, 0x00,             // NumChannels (1 = mono)
        0x80, 0x3e, 0x00, 0x00, // SampleRate (16000 Hz)
        0x00, 0x7d, 0x00, 0x00, // ByteRate (16000 * 1 * 16/8)
        0x02, 0x00,             // BlockAlign (1 * 16/8)
        0x10, 0x00,             // BitsPerSample (16)
        
        // data subchunk
        0x64, 0x61, 0x74, 0x61, // "data"
        0x00, 0x00, 0x00, 0x00  // Subchunk2Size (0 bytes of data)
      ]);
      
      return minimalWav;
    }
  }

  // Función para enviar la solicitud a Whisper con configuración específica
  private async sendWhisperRequestWithConfig(audioPath: string, apiKey: string, whisperUrl: string): Promise<string> {
    try {
      // Verificar que el archivo existe
      if (!fs.existsSync(audioPath)) {
        this.logger.error(`El archivo ${audioPath} no existe`);
        throw new Error('El archivo de audio no existe');
      }
      
      const stats = fs.statSync(audioPath);
      this.logger.log(`📁 Archivo para Whisper: ${audioPath} (${stats.size} bytes)`);
      
      // Verificar tamaño límite de OpenAI (25MB)
      if (stats.size > 25 * 1024 * 1024) {
        this.logger.error(`Archivo demasiado grande: ${stats.size} bytes`);
        throw new Error('El archivo es demasiado grande para Whisper API');
      }
      
      // Verificar que el archivo no esté vacío
      if (stats.size < 100) {
        this.logger.warn(`Archivo muy pequeño: ${stats.size} bytes`);
        throw new Error('Archivo de audio demasiado pequeño');
      }
      
      // Determinar la extensión y content-type
      const fileExtension = path.extname(audioPath).toLowerCase();
      const allowedExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.flac', '.webm'];
      
      if (!allowedExtensions.includes(fileExtension)) {
        this.logger.warn(`Extensión no soportada: ${fileExtension}, convirtiendo a .mp3`);
        // Si la extensión no es soportada, asumir que es MP3
      }
      
      // Mapeo de content-types según documentación de OpenAI
      const contentTypeMap: {[key: string]: string} = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.mp4': 'audio/mp4',
        '.mpeg': 'audio/mpeg',
        '.mpga': 'audio/mpeg',
        '.oga': 'audio/ogg',
        '.ogg': 'audio/ogg',
        '.flac': 'audio/flac',
        '.webm': 'audio/webm'
      };
      
      const contentType = contentTypeMap[fileExtension] || 'audio/mpeg';
      
      // Crear FormData para OpenAI
      const formData = new FormData();
      
      formData.append('file', fs.createReadStream(audioPath), {
        filename: `audio${fileExtension}`,
        contentType: contentType
      });
      
      formData.append('model', 'whisper-1');
      formData.append('language', 'es');
      formData.append('response_format', 'json');
      formData.append('temperature', '0');
      
      this.logger.log(`🎯 Enviando a Whisper API: ${audioPath} (${contentType})`);
      this.logger.log(`🎯 URL: ${whisperUrl}`);
      this.logger.log(`🎯 API Key: ${apiKey.substring(0, 10)}...`);
      
      // Realizar solicitud a Whisper API
      const response = await axios.post(
        whisperUrl,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            ...formData.getHeaders(),
          },
          timeout: 60000,
          maxContentLength: 26214400, // 25MB
          maxBodyLength: 26214400    // 25MB
        }
      );
      
      if (!response.data || typeof response.data.text !== 'string') {
        this.logger.error('Respuesta de Whisper API inválida');
        throw new Error('Respuesta de Whisper inválida');
      }
      
      const transcription = response.data.text.trim();
      this.logger.log(`✅ Transcripción de Whisper API: "${transcription}"`);
      
      if (transcription.length === 0) {
        throw new Error('Transcripción vacía');
      }
      
      return transcription;
      
    } catch (error) {
      this.logger.error(`💥 Error en Whisper API: ${error.message}`);
      
      // Si la API falla, dar una respuesta útil al usuario
      if (error.response) {
        this.logger.error(`Whisper API Response: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        
        if (error.response.status === 401) {
          throw new Error('API key de Whisper inválida. Verifique la configuración.');
        } else if (error.response.status === 402) {
          throw new Error('Sin créditos en la cuenta de OpenAI. Contacte al administrador.');
        } else if (error.response.status === 429) {
          throw new Error('Límite de uso excedido en OpenAI. Intente más tarde.');
        }
      }
      
      throw new Error('No se pudo transcribir el audio. Verifique la configuración de Whisper.');
    }
  }
}

