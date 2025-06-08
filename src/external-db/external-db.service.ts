import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';

@Injectable()
export class ExternalDbService implements OnModuleInit {
  private readonly logger = new Logger(ExternalDbService.name);
  private externalConnections: Map<string, DataSource> = new Map();

  constructor(
    @InjectRepository(ChatbotInstance, 'users')
    private chatbotInstanceRepository: Repository<ChatbotInstance>
  ) {
    // ✅ SaaS Mode: Inicialización completamente dinámica
    this.logger.log('🏢 ExternalDbService inicializado - Modo SaaS 100% dinámico');
    this.logger.log('📋 Conexiones se crearán bajo demanda según configuración del frontend');
    this.logger.log('🔄 Se implementó persistencia automática de conexiones');
  }

  /**
   * Inicialización automática al arrancar el módulo
   * Carga todas las configuraciones de BD externas de chatbots activos
   */
  async onModuleInit() {
    try {
      this.logger.log('🚀 Inicializando conexiones a BD externas...');
      
      if (!this.chatbotInstanceRepository) {
        this.logger.warn('⚠️ chatbotInstanceRepository no disponible, no se pueden cargar configuraciones');
        return;
      }
      
      const chatbotsWithExternalDb = await this.chatbotInstanceRepository.find({
        where: { isActive: true }
      });
      
      if (!chatbotsWithExternalDb || chatbotsWithExternalDb.length === 0) {
        this.logger.log('ℹ️ No se encontraron chatbots activos con configuración BD externa');
        return;
      }
      
      this.logger.log(`🔍 Analizando ${chatbotsWithExternalDb.length} chatbots para configuración BD externa`);
      
      let initializedConnections = 0;
      
      // Procesar cada chatbot e inicializar conexiones para los que tienen BD externa habilitada
      for (const chatbot of chatbotsWithExternalDb) {
        try {
          const externalDbConfig = typeof chatbot.externalDbConfig === 'string'
            ? JSON.parse(chatbot.externalDbConfig)
            : chatbot.externalDbConfig;
          
          if (externalDbConfig && externalDbConfig.enabled) {
            this.logger.log(`🔄 Inicializando conexión para: ${chatbot.name} (${chatbot.id})`);
            
            // Crear la conexión
            await this.crearConexionDirecta({
              host: externalDbConfig.host,
              port: externalDbConfig.port,
              username: externalDbConfig.username,
              password: externalDbConfig.password,
              database: externalDbConfig.database,
              ssl: externalDbConfig.ssl || false
            }, chatbot.id);
            
            initializedConnections++;
          }
        } catch (chatbotError) {
          this.logger.error(`❌ Error inicializando conexión para chatbot ${chatbot.name}: ${chatbotError.message}`);
        }
      }
      
      this.logger.log(`✅ Inicialización completada. ${initializedConnections} conexiones establecidas`);
      
    } catch (error) {
      this.logger.error(`❌ Error en onModuleInit: ${error.message}`);
    }
  }

  /**
   * Verifica si una conexión está activa y la reconecta si es necesario
   * @param connectionId ID de la conexión (generalmente el chatbotId)
   * @returns La conexión verificada o reconectada
   */
  async reconnectIfNeeded(connectionId: string): Promise<DataSource | null> {
    try {
      // Verificar si existe la conexión
      const connection = this.externalConnections.get(connectionId);
      if (!connection) {
        this.logger.warn(`⚠️ No existe conexión para reconectar: ${connectionId}`);
        return null;
      }
      
      // Verificar si la conexión está inicializada
      if (!connection.isInitialized) {
        this.logger.log(`🔄 Reconectando conexión: ${connectionId}`);
        await connection.initialize();
        this.logger.log(`✅ Reconexión exitosa: ${connectionId}`);
      }
      
      return connection;
    } catch (error) {
      this.logger.error(`❌ Error reconectando: ${error.message}`);
      
      // Si falla la reconexión, intentar recrear la conexión desde la configuración
      try {
        this.logger.log(`🔄 Intentando recrear conexión desde configuración: ${connectionId}`);
        const chatbot = await this.chatbotInstanceRepository.findOne({
          where: { id: connectionId }
        });
        
        if (chatbot && chatbot.externalDbConfig) {
          const config = typeof chatbot.externalDbConfig === 'string'
            ? JSON.parse(chatbot.externalDbConfig)
            : chatbot.externalDbConfig;
          
          if (config.enabled) {
            return await this.crearConexionDirecta({
              host: config.host,
              port: config.port,
              username: config.username,
              password: config.password,
              database: config.database,
              ssl: config.ssl || false
            }, connectionId);
          }
        }
      } catch (recreateError) {
        this.logger.error(`❌ Error recreando conexión: ${recreateError.message}`);
      }
      
      return null;
    }
  }

  /**
   * Crear conexión directa con parámetros específicos
   * Útil para conectar a bases de datos conocidas sin configuración previa
   */
  async crearConexionDirecta(config: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl?: boolean;
  }, connectionId: string = 'direct'): Promise<DataSource | null> {
    try {
      // Si ya existe esta conexión, devolverla
      if (this.externalConnections.has(connectionId)) {
        return this.externalConnections.get(connectionId);
      }

      const { DataSource: TypeOrmDataSource } = require('typeorm');
      
      // Configuración optimizada para PostgreSQL
      const dataSourceConfig = {
        type: 'postgres',
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        logging: ['error'],
        synchronize: false,
        entities: [],
        retryAttempts: 5,
        retryDelay: 3000,
        connectTimeoutMS: 15000,
        extra: {
          max: 10, // conexiones máximas por pool
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 300000 // 5 minutos
        }
      };

      this.logger.log(`🔗 Creando conexión directa a: ${config.host}:${config.port}/${config.database}`);
      
      const dataSource = new TypeOrmDataSource(dataSourceConfig);
      await dataSource.initialize();
      
      this.logger.log(`✅ Conexión directa establecida para: ${connectionId}`);
      this.externalConnections.set(connectionId, dataSource);
      
      return dataSource;
    } catch (error) {
      this.logger.error(`❌ Error creando conexión directa para ${connectionId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Ejecuta una consulta personalizada en la base de datos externa
   * @param query Consulta SQL a ejecutar
   * @param params Parámetros para la consulta
   * @param chatbotId ID del chatbot para obtener su configuración de BD
   * @returns Resultado de la consulta
   */
  async ejecutarQuery(query: string, params: any[] = [], chatbotId: string = 'default') {
    try {
      // Buscar conexión existente para este chatbot
      let connection = this.externalConnections.get(chatbotId);
      
      // Si no hay conexión o no está inicializada, intentar reconectar
      if (!connection || !connection.isInitialized) {
        this.logger.log(`🔄 Conexión no disponible o no inicializada para ${chatbotId}, intentando reconectar`);
        connection = await this.reconnectIfNeeded(chatbotId);
        
        if (!connection) {
          throw new Error(`No hay conexión disponible para chatbot: ${chatbotId}`);
        }
      }

      this.logger.log(`🔍 Ejecutando query para chatbot: ${chatbotId}`);
      const resultado = await connection.query(query, params);
      
      this.logger.log(`✅ Query ejecutada, ${resultado.length} resultados`);
      return resultado;
    } catch (error) {
      this.logger.error(`❌ Error ejecutando query para ${chatbotId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verificar si existe conexión para un chatbot
   */
  hasConnection(chatbotId: string): boolean {
    return this.externalConnections.has(chatbotId);
  }

  /**
   * Verifica si una conexión está inicializada
   * @param chatbotId ID de la conexión (generalmente el chatbotId)
   * @returns true si la conexión existe y está inicializada
   */
  async isConnectionInitialized(chatbotId: string): Promise<boolean> {
    try {
      const connection = this.externalConnections.get(chatbotId);
      return connection ? connection.isInitialized : false;
    } catch (error) {
      this.logger.error(`❌ Error verificando inicialización: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtener información de las conexiones activas
   */
  getActiveConnections(): string[] {
    return Array.from(this.externalConnections.keys());
  }

  /**
   * Cerrar conexión específica
   */
  async closeConnection(chatbotId: string): Promise<void> {
    const connection = this.externalConnections.get(chatbotId);
    if (connection) {
      await connection.destroy();
      this.externalConnections.delete(chatbotId);
      this.logger.log(`🔒 Conexión cerrada para chatbot: ${chatbotId}`);
    }
  }

  /**
   * Cerrar todas las conexiones
   */
  async closeAllConnections(): Promise<void> {
    for (const [chatbotId, connection] of this.externalConnections) {
      await connection.destroy();
      this.logger.log(`🔒 Conexión cerrada para chatbot: ${chatbotId}`);
    }
    this.externalConnections.clear();
  }

  /**
   * ⚠️ MÉTODOS LEGACY - Mantenidos para compatibilidad pero deprecados en modo SaaS
   */

  async obtenerProductos(busqueda?: string, chatbotId: string = 'default') {
    this.logger.warn('⚠️ obtenerProductos es método legacy - usar ValeryDbService en su lugar');
    return [];
  }

  async obtenerClientePorTelefono(telefono: string, chatbotId: string = 'default') {
    this.logger.warn('⚠️ obtenerClientePorTelefono es método legacy - usar ValeryDbService en su lugar');
    return null;
  }
} 