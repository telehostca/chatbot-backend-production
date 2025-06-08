import { IsString, IsNotEmpty, IsObject, IsOptional, IsUUID, ValidateNested, IsIn, IsBoolean, IsNumber, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AIConfigDto {
  @ApiProperty({
    description: 'Proveedor de IA a utilizar',
    enum: ['deepseek', 'openai', 'claude', 'gemini', 'custom'],
    example: 'deepseek'
  })
  @IsString()
  @IsIn(['deepseek', 'openai', 'claude', 'gemini', 'custom'])
  provider: string;

  @ApiProperty({
    description: 'Clave API del proveedor de IA',
    example: 'sk-your-api-key-here'
  })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty({
    description: 'Modelo específico del proveedor a utilizar',
    example: 'deepseek-chat'
  })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({
    description: 'Temperatura para controlar la creatividad de las respuestas (0.0-2.0)',
    example: 0.7,
    required: false,
    minimum: 0,
    maximum: 2
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  temperature?: number;

  @ApiProperty({
    description: 'Máximo número de tokens en la respuesta',
    example: 1000,
    required: false,
    minimum: 1,
    maximum: 4000
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxTokens?: number;

  @ApiProperty({
    description: 'Prompt del sistema para personalizar el comportamiento del chatbot',
    example: 'Eres un asistente virtual amigable que ayuda a los clientes con sus compras.',
    required: false
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

class WhatsappConfigDto {
  @ApiProperty({
    description: 'Proveedor de WhatsApp a utilizar',
    enum: ['evolution-api', 'waba-sms', 'custom'],
    example: 'evolution-api'
  })
  @IsString()
  @IsIn(['evolution-api', 'waba-sms', 'custom'])
  provider: string;

  @ApiProperty({
    description: 'Nombre único de la instancia de WhatsApp',
    example: 'mi-tienda-bot'
  })
  @IsString()
  @IsNotEmpty()
  instanceName: string;

  @ApiProperty({
    description: 'URL de la API de WhatsApp',
    example: 'https://api.whatsapp.com/v1'
  })
  @IsString()
  @IsNotEmpty()
  apiUrl: string;

  @ApiProperty({
    description: 'Clave API para la integración con WhatsApp',
    example: 'whatsapp-api-key-12345'
  })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty({
    description: 'URL del webhook para recibir mensajes',
    example: 'https://mi-servidor.com/webhook/whatsapp',
    required: false
  })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiProperty({
    description: 'Número de teléfono asociado a la cuenta de WhatsApp',
    example: '+584141234567',
    required: false
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

class ExternalDbConfigDto {
  @ApiProperty({
    description: 'Habilitar conexión a base de datos externa',
    example: true
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Host de la base de datos externa',
    example: 'localhost',
    required: false
  })
  @IsOptional()
  @IsString()
  host?: string;

  @ApiProperty({
    description: 'Puerto de la base de datos externa',
    example: 3306,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  port?: number;

  @ApiProperty({
    description: 'Usuario de la base de datos externa',
    example: 'db_user',
    required: false
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    description: 'Contraseña de la base de datos externa',
    example: 'secure_password',
    required: false
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({
    description: 'Nombre de la base de datos externa',
    example: 'mi_tienda_db',
    required: false
  })
  @IsOptional()
  @IsString()
  database?: string;

  @ApiProperty({
    description: 'Tipo de base de datos externa',
    enum: ['mysql', 'postgres', 'mssql'],
    example: 'mysql',
    required: false
  })
  @IsOptional()
  @IsIn(['mysql', 'postgres', 'mssql'])
  type?: string;

  @ApiProperty({
    description: 'Usar conexión SSL',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  ssl?: boolean;
}

class ChatbotConfigDto {
  @ApiProperty({
    description: 'Idioma principal del chatbot',
    example: 'es',
    required: false
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'Personalidad del chatbot',
    enum: ['professional', 'friendly', 'casual', 'enthusiastic'],
    example: 'friendly',
    required: false
  })
  @IsOptional()
  @IsIn(['professional', 'friendly', 'casual', 'enthusiastic'])
  personality?: string;

  @ApiProperty({
    description: 'Estilo de respuesta del chatbot',
    enum: ['formal', 'casual', 'technical'],
    example: 'casual',
    required: false
  })
  @IsOptional()
  @IsIn(['formal', 'casual', 'technical'])
  responseStyle?: string;

  @ApiProperty({
    description: 'Usar emojis en las respuestas',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  useEmojis?: boolean;

  @ApiProperty({
    description: 'Tiempo de respuesta en milisegundos',
    example: 2000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  responseTimeMs?: number;

  @ApiProperty({
    description: 'Número máximo de items en el carrito',
    example: 50,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxCartItems?: number;

  @ApiProperty({
    description: 'Timeout de sesión en horas',
    example: 24,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sessionTimeoutHours?: number;

  @ApiProperty({
    description: 'Habilitar análisis de sentimientos',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  enableSentimentAnalysis?: boolean;

  @ApiProperty({
    description: 'Habilitar corrección ortográfica',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  enableSpellCorrection?: boolean;
}

export class CreateChatbotDto {
  @ApiProperty({
    description: 'ID único de la organización',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    description: 'Nombre del chatbot',
    example: 'Mi Tienda Bot',
    minLength: 1
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'Slug único del chatbot (usado en URLs)',
    example: 'mi-tienda-bot'
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    description: 'Descripción del chatbot',
    example: 'Chatbot para atender clientes de mi tienda online',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Configuración de IA',
    type: AIConfigDto,
    example: {
      provider: 'deepseek',
      apiKey: 'sk-your-api-key-here',
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'Eres un asistente virtual amigable que ayuda a los clientes con sus compras.'
    }
  })
  @ValidateNested()
  @Type(() => AIConfigDto)
  aiConfig: AIConfigDto;

  @ApiProperty({
    description: 'Configuración de WhatsApp',
    type: WhatsappConfigDto,
    example: {
      provider: 'evolution-api',
      instanceName: 'mi-tienda-bot',
      apiUrl: 'https://api.whatsapp.com/v1',
      apiKey: 'whatsapp-api-key-12345',
      webhookUrl: 'https://mi-servidor.com/webhook/whatsapp',
      phoneNumber: '+584141234567'
    }
  })
  @ValidateNested()
  @Type(() => WhatsappConfigDto)
  whatsappConfig: WhatsappConfigDto;

  @ApiProperty({
    description: 'Configuración de base de datos externa',
    type: ExternalDbConfigDto,
    required: false,
    example: {
      enabled: true,
      host: 'localhost',
      port: 3306,
      username: 'db_user',
      password: 'secure_password',
      database: 'mi_tienda_db',
      type: 'mysql',
      ssl: false
    }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExternalDbConfigDto)
  externalDbConfig?: ExternalDbConfigDto;

  @ApiProperty({
    description: 'Configuración del comportamiento del chatbot',
    type: ChatbotConfigDto,
    required: false,
    example: {
      language: 'es',
      personality: 'friendly',
      responseStyle: 'casual',
      useEmojis: true,
      responseTimeMs: 2000,
      maxCartItems: 50,
      sessionTimeoutHours: 24,
      enableSentimentAnalysis: false,
      enableSpellCorrection: true
    }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatbotConfigDto)
  chatbotConfig?: ChatbotConfigDto;
}