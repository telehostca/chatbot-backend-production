/**
 * Controlador para gestión de configuraciones de bases de datos externas.
 */
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { DatabaseMapperService } from '../services/database-mapper.service';
import { DatabaseSchemaConfig } from '../schemas/database-schema.interface';
import { ejemploSistemaFacturacionMySQL, ejemploSistemaInventarioPostgreSQL } from '../configs/example-database-configs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotInstance } from '../../admin/entities/chatbot-instance.entity';

interface DatabaseTestConnectionDto {
  databaseType: 'mysql' | 'postgres' | 'mssql' | 'oracle';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

interface DatabaseConfigSummary {
  chatbotId: string;
  description: string;
  databaseType: string;
  tablesCount: number;
  queriesCount: number;
  businessRulesCount: number;
  isActive: boolean;
  lastModified?: Date;
}

@ApiTags('database-config')
@Controller('database-config')
export class DatabaseConfigController {
  private readonly logger = new Logger(DatabaseConfigController.name);

  constructor(
    private readonly databaseMapper: DatabaseMapperService,
    @InjectRepository(ChatbotInstance, 'users')
    private readonly chatbotInstanceRepository: Repository<ChatbotInstance>
  ) {}

  @Get()
  async getAllConfigurations(): Promise<{ success: boolean; data: DatabaseConfigSummary[] }> {
    try {
      const configurations: DatabaseConfigSummary[] = [];
      
      // Obtener todas las configuraciones guardadas del servicio
      const allSchemas = this.databaseMapper.getAllDatabaseSchemas();
      
      // Convertir cada configuración a summary
      for (const schema of allSchemas) {
        configurations.push({
          chatbotId: schema.chatbotId,
          description: schema.description || 'Sin descripción',
          databaseType: schema.databaseType,
          tablesCount: Object.keys(schema.tables || {}).length,
          queriesCount: Object.keys(schema.queries || {}).length,
          businessRulesCount: (schema.businessRules || []).length,
          isActive: true,
          lastModified: new Date()
        });
      }

      // No agregar ejemplos predeterminados - solo mostrar configuraciones reales

      this.logger.log(`📋 Se encontraron ${configurations.length} configuraciones en total`);
      return { success: true, data: configurations };
    } catch (error) {
      this.logger.error('❌ Error obteniendo configuraciones:', error.message);
      throw new HttpException('Error interno', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':chatbotId')
  async getDatabaseSchema(@Param('chatbotId') chatbotId: string) {
    try {
      const schema = await this.databaseMapper.getDatabaseSchema(chatbotId);
      return {
        success: true,
        data: schema
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Diagnóstico de uso de base de datos externa
   * @param chatbotId ID del chatbot
   * @returns Diagnóstico de configuración
   */
  @Get('diagnostic/:chatbotId')
  async getDiagnostic(@Param('chatbotId') chatbotId: string) {
    try {
      // Obtener configuración del chatbot
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { id: chatbotId }
      });

      if (!chatbot) {
        return {
          success: false,
          error: 'Chatbot no encontrado'
        };
      }

      // Verificar configuración de BD externa
      let externalDbConfig = null;
      try {
        externalDbConfig = typeof chatbot.externalDbConfig === 'string'
          ? JSON.parse(chatbot.externalDbConfig)
          : chatbot.externalDbConfig;
      } catch (e) {
        externalDbConfig = null;
      }

      // Verificar configuración de IA
      let aiConfig = null;
      try {
        aiConfig = typeof chatbot.aiConfig === 'string'
          ? JSON.parse(chatbot.aiConfig)
          : chatbot.aiConfig;
      } catch (e) {
        aiConfig = null;
      }

      // Verificar configuración de procesamiento
      let chatbotConfig = null;
      try {
        chatbotConfig = typeof chatbot.chatbotConfig === 'string'
          ? JSON.parse(chatbot.chatbotConfig)
          : chatbot.chatbotConfig;
      } catch (e) {
        chatbotConfig = null;
      }

      // Verificar mapeo de DB
      const hasDbMapping = this.databaseMapper.getDatabaseSchema(chatbotId) !== null;

      return {
        success: true,
        chatbotId: chatbot.id,
        chatbotName: chatbot.name,
        databaseIntegration: externalDbConfig?.enabled || false,
        aiIntegration: aiConfig?.enabled || false,
        processingMode: this.determineProcessingMode(chatbotConfig),
        aiPreference: aiConfig?.preference || null,
        aiProvider: aiConfig?.provider || null,
        dbMappingConfigured: hasDbMapping,
        databaseType: externalDbConfig?.type || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determina el modo de procesamiento basado en la configuración
   */
  private determineProcessingMode(config: any): string {
    if (!config) return 'Desconocido';
    
    if (config.processingMode) {
      return config.processingMode;
    }
    
    if (config.useAI === true && config.useIntents === false) {
      return 'AI Priority';
    } else if (config.useAI === false && config.useIntents === true) {
      return 'Intents Priority';
    } else if (config.useAI === true && config.useIntents === true) {
      return 'Hybrid';
    }
    
    return 'Desconocido';
  }

  @Post()
  async saveConfiguration(@Body() config: DatabaseSchemaConfig): Promise<{ success: boolean; message: string }> {
    try {
      await this.databaseMapper.registerDatabaseSchema(config);
      return { success: true, message: `Configuración registrada: ${config.chatbotId}` };
    } catch (error) {
      throw new HttpException(`Error: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':chatbotId')
  @ApiOperation({ summary: 'Actualizar configuración de base de datos existente' })
  @ApiParam({ name: 'chatbotId', description: 'ID del chatbot a actualizar' })
  async updateConfiguration(
    @Param('chatbotId') chatbotId: string,
    @Body() config: DatabaseSchemaConfig
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Asegurar que el chatbotId coincide
      config.chatbotId = chatbotId;
      await this.databaseMapper.registerDatabaseSchema(config);
      this.logger.log(`✅ Configuración actualizada para chatbot: ${chatbotId}`);
      return { success: true, message: `Configuración actualizada: ${chatbotId}` };
    } catch (error) {
      this.logger.error(`❌ Error actualizando configuración para ${chatbotId}:`, error.message);
      throw new HttpException(`Error actualizando configuración: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':chatbotId')
  @ApiOperation({ summary: 'Eliminar configuración de base de datos' })
  @ApiParam({ name: 'chatbotId', description: 'ID del chatbot a eliminar' })
  async deleteConfiguration(@Param('chatbotId') chatbotId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Eliminar realmente del servicio
      const deleted = this.databaseMapper.removeDatabaseSchema(chatbotId);
      if (deleted) {
        this.logger.log(`🗑️ Configuración eliminada para chatbot: ${chatbotId}`);
        return { success: true, message: `Configuración eliminada: ${chatbotId}` };
      } else {
        this.logger.warn(`⚠️ No se encontró configuración para eliminar: ${chatbotId}`);
        throw new HttpException(`Configuración no encontrada: ${chatbotId}`, HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      this.logger.error(`❌ Error eliminando configuración para ${chatbotId}:`, error.message);
      throw new HttpException(`Error eliminando configuración: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('test-connection')
  async testConnection(@Body() connectionData: DatabaseTestConnectionDto): Promise<{ success: boolean; message: string }> {
    try {
      await this.performConnectionTest(connectionData);
      return { success: true, message: 'Conexión exitosa' };
    } catch (error) {
      throw new HttpException(`Error de conexión: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * AUTO-DETECTA esquema de base de datos REAL
   */
  @Post('detect-schema')
  @ApiOperation({ 
    summary: 'Auto-detectar esquema de base de datos',
    description: 'Conecta a una base de datos y detecta tablas automáticamente'
  })
  async detectDatabaseSchema(@Body() connectionData: DatabaseTestConnectionDto): Promise<any> {
    const { DataSource } = require('typeorm');
    let dataSource: any;
    
    try {
      this.logger.log(`🔍 Detectando esquema REAL de BD: ${connectionData.database}`);
      
      // Crear conexión temporal a la base de datos
      dataSource = new DataSource({
        type: connectionData.databaseType,
        host: connectionData.host,
        port: connectionData.port,
        username: connectionData.username,
        password: connectionData.password,
        database: connectionData.database,
        synchronize: false,
        logging: false
      });

      await dataSource.initialize();
      this.logger.log(`✅ Conectado a ${connectionData.databaseType} para detección`);

      // Detectar tablas según el tipo de BD
      let rawResults: any[] = [];
      
      if (connectionData.databaseType === 'postgres') {
        const query = `
          SELECT 
            t.table_name,
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            c.character_maximum_length,
            CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END as is_primary,
            CASE WHEN tc.constraint_type = 'FOREIGN KEY' THEN true ELSE false END as is_foreign
          FROM information_schema.tables t
          LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
          LEFT JOIN information_schema.key_column_usage kcu ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
          LEFT JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
          WHERE t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
            AND c.table_name IS NOT NULL
          ORDER BY t.table_name, c.ordinal_position
        `;
        rawResults = await dataSource.query(query);
      } else if (connectionData.databaseType === 'mysql') {
        const query = `
          SELECT 
            t.TABLE_NAME as table_name,
            c.COLUMN_NAME as column_name,
            c.DATA_TYPE as data_type,
            c.IS_NULLABLE as is_nullable,
            c.COLUMN_DEFAULT as column_default,
            c.CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
            CASE WHEN c.COLUMN_KEY = 'PRI' THEN true ELSE false END as is_primary,
            CASE WHEN c.COLUMN_KEY = 'MUL' THEN true ELSE false END as is_foreign
          FROM information_schema.TABLES t
          LEFT JOIN information_schema.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
          WHERE t.TABLE_SCHEMA = DATABASE()
            AND t.TABLE_TYPE = 'BASE TABLE'
            AND c.TABLE_NAME IS NOT NULL
          ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
        `;
        rawResults = await dataSource.query(query);
      }

      // Procesar resultados y agrupar por tabla
      const tablesMap = new Map();
      rawResults.forEach(row => {
        const tableName = row.table_name;
        
        if (!tablesMap.has(tableName)) {
          tablesMap.set(tableName, {
            name: tableName,
            primaryKey: '',
            columns: [],
            estimatedPurpose: this.estimateTablePurpose(tableName)
          });
        }

        const table = tablesMap.get(tableName);
        const column = {
          name: row.column_name,
          type: row.data_type,
          isPrimary: row.is_primary === true || row.is_primary === 1,
          isForeign: row.is_foreign === true || row.is_foreign === 1,
          isNullable: row.is_nullable === 'YES' || row.is_nullable === true,
          defaultValue: row.column_default,
          maxLength: row.character_maximum_length
        };

        table.columns.push(column);
        
        // Establecer clave primaria
        if (column.isPrimary && !table.primaryKey) {
          table.primaryKey = column.name;
        }
      });

      const detectedTables = Array.from(tablesMap.values());
      const detectedPatterns = this.analyzeBusinessPatterns(detectedTables);

      // Configuración sugerida basada en tablas reales
      const suggestedConfig = this.generateSuggestedConfig(detectedTables, connectionData, detectedPatterns);

      const schema = {
        tables: detectedTables,
        detectedPatterns,
        totalTables: detectedTables.length
      };

      this.logger.log(`✅ Detección real completada: ${detectedTables.length} tablas encontradas`);

      return {
        success: true,
        schema,
        suggestedConfig,
        message: `Esquema detectado: ${detectedTables.length} tablas encontradas`
      };

    } catch (error) {
      this.logger.error(`Error en auto-detección real: ${error.message}`);
      throw new HttpException(`Error detectando esquema: ${error.message}`, HttpStatus.BAD_REQUEST);
    } finally {
      if (dataSource && dataSource.isInitialized) {
        await dataSource.destroy();
        this.logger.log(`🔌 Conexión temporal cerrada`);
      }
    }
  }

  private estimateTablePurpose(tableName: string): string {
    const name = tableName.toLowerCase();
    if (name.includes('client') || name.includes('clientes')) return 'Gestión de clientes';
    if (name.includes('product') || name.includes('inventario')) return 'Control de inventario';
    if (name.includes('encabedoc') || name.includes('order') || name.includes('venta')) return 'Documentos de venta';
    if (name.includes('movimiento') || name.includes('detail')) return 'Detalles de documentos';
    if (name.includes('pago') || name.includes('payment')) return 'Gestión de pagos';
    if (name.includes('delivery')) return 'Sistema de delivery';
    if (name.includes('colaborador') || name.includes('empleado')) return 'Recursos humanos';
    if (name.includes('deposito') || name.includes('almacen')) return 'Gestión de almacenes';
    if (name.includes('banco') || name.includes('moneda')) return 'Configuración financiera';
    return 'Tabla del sistema';
  }

  private analyzeBusinessPatterns(tables: any[]): string[] {
    const patterns: string[] = [];
    const tableNames = tables.map(t => t.name.toLowerCase());
    
    if (tableNames.some(n => n.includes('client') || n.includes('clientes')) &&
        tableNames.some(n => n.includes('inventario') || n.includes('product')) &&
        tableNames.some(n => n.includes('encabedoc') || n.includes('venta'))) {
      patterns.push('Sistema de Facturación Completo');
    }
    
    if (tableNames.some(n => n.includes('delivery'))) {
      patterns.push('Sistema de Delivery');
    }
    
    if (tableNames.some(n => n.includes('pago') || n.includes('banco'))) {
      patterns.push('Pagos Venezolanos');
    }

    if (tableNames.some(n => n.includes('movimiento')) && tableNames.some(n => n.includes('encabedoc'))) {
      patterns.push('Documentos Maestro-Detalle');
    }
    
    return patterns.length > 0 ? patterns : ['Sistema Empresarial'];
  }

  private generateSuggestedConfig(tables: any[], connectionData: any, patterns: string[]): any {
    const config: any = {
      chatbotId: '',
      databaseType: connectionData.databaseType,
      description: `Sistema auto-detectado - ${patterns.join(', ')}`,
      tables: {},
      relationships: [],
      queries: {},
      agentInstructions: {
        generalContext: `Sistema ${connectionData.databaseType} con ${tables.length} tablas detectadas`,
        responseFormats: {
          successMessages: { create: "Registro creado", update: "Registro actualizado", delete: "Registro eliminado" },
          errorMessages: { not_found: "Registro no encontrado", validation_error: "Datos inválidos" },
          dataPresentation: { list: "Lista de registros", detail: "Detalle del registro" }
        }
      },
      businessRules: []
    };

    // Mapear TODAS las tablas detectadas
    tables.forEach(table => {
      const tableName = table.name.toLowerCase();
      let mappedName = 'otros';
      
      if (tableName.includes('client') || tableName.includes('clientes')) {
        mappedName = 'clientes';
      } else if (tableName.includes('inventario') || tableName.includes('product')) {
        mappedName = 'productos';
      } else if (tableName.includes('encabedoc') || tableName.includes('encab')) {
        mappedName = 'encabezadoDoc';
      } else if (tableName.includes('movimiento') || tableName.includes('detail')) {
        mappedName = 'movimientosDoc';
      } else if (tableName.includes('pago') || tableName.includes('payment') || tableName.includes('tipospagos')) {
        mappedName = 'metodosPago';
      } else {
        // Para tablas que no coinciden con patrones conocidos, usar el nombre original
        mappedName = table.name;
      }

      // Si ya existe una tabla con ese nombre mapeado, usar el nombre original para evitar conflictos
      if (config.tables[mappedName] && mappedName !== table.name) {
        mappedName = table.name;
      }

      config.tables[mappedName] = {
        tableName: table.name,
        primaryKey: table.primaryKey || 'id',
        columns: table.columns.map(col => ({
          name: col.name,
          type: col.type,
          standardName: col.name
        })),
        purpose: this.estimateTablePurpose(table.name),
        totalColumns: table.columns.length
      };

      // Generar consultas básicas para cada tabla
      const pk = table.primaryKey || 'id';
      config.queries[`buscar${mappedName.charAt(0).toUpperCase() + mappedName.slice(1)}`] = `SELECT * FROM ${table.name} WHERE ${pk} = $1`;
      config.queries[`listar${mappedName.charAt(0).toUpperCase() + mappedName.slice(1)}`] = `SELECT * FROM ${table.name} ORDER BY ${pk} DESC LIMIT 50`;
      config.queries[`contar${mappedName.charAt(0).toUpperCase() + mappedName.slice(1)}`] = `SELECT COUNT(*) as total FROM ${table.name}`;
    });

    return config;
  }

  /**
   * DETECTA recursos disponibles en el servidor (BD y usuarios)
   */
  @Post('discover-resources')
  @ApiOperation({ 
    summary: 'Descubrir bases de datos y usuarios disponibles',
    description: 'Conecta al servidor y lista bases de datos y usuarios disponibles para el usuario'
  })
  async discoverDatabaseResources(@Body() connectionData: DatabaseTestConnectionDto): Promise<any> {
    const { DataSource } = require('typeorm');
    let dataSource: any;
    
    try {
      this.logger.log(`🔍 Descubriendo recursos en servidor: ${connectionData.host}:${connectionData.port}`);
      
      // Intentar conectar como admin primero para descubrir recursos
      const adminConnections = [
        // Intentar con credenciales proporcionadas
        { ...connectionData },
        // Intentar conexiones comunes de admin si falla
        { ...connectionData, database: 'postgres', username: 'postgres' },
        { ...connectionData, database: 'template1', username: 'postgres' },
        { ...connectionData, database: connectionData.database, username: 'postgres' }
      ];

      let availableResources = null;
      let connectionUsed = null;

      for (const connConfig of adminConnections) {
        try {
          dataSource = new DataSource({
            type: connConfig.databaseType,
            host: connConfig.host,
            port: connConfig.port,
            username: connConfig.username,
            password: connConfig.password,
            database: connConfig.database,
            synchronize: false,
            logging: false
          });

          await dataSource.initialize();
          this.logger.log(`✅ Conectado como ${connConfig.username} a ${connConfig.database}`);
          connectionUsed = connConfig;

          // Detectar bases de datos disponibles
          let databases = [];
          let users = [];

          if (connConfig.databaseType === 'postgres') {
            // Listar bases de datos
            databases = await dataSource.query(`
              SELECT datname as name, pg_database_size(datname) as size 
              FROM pg_database 
              WHERE datistemplate = false 
              AND datname NOT IN ('postgres', 'template0', 'template1')
              ORDER BY datname
            `);

            // Listar usuarios/roles
            users = await dataSource.query(`
              SELECT rolname as username, rolcanlogin as can_login,
                     rolsuper as is_superuser, rolcreatedb as can_create_db
              FROM pg_roles 
              WHERE rolname NOT LIKE 'pg_%' 
              AND rolname != 'postgres'
              ORDER BY rolname
            `);
          } else if (connConfig.databaseType === 'mysql') {
            // Listar bases de datos MySQL
            databases = await dataSource.query(`SHOW DATABASES`);
            databases = databases
              .filter(db => !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db.Database))
              .map(db => ({ name: db.Database, size: null }));

            // Listar usuarios MySQL
            users = await dataSource.query(`
              SELECT User as username, Host as host 
              FROM mysql.user 
              WHERE User != 'root' AND User != '' 
              ORDER BY User
            `);
          }

          availableResources = {
            databases: databases || [],
            users: users || [],
            serverInfo: {
              type: connConfig.databaseType,
              version: await this.getServerVersion(dataSource, connConfig.databaseType),
              host: connConfig.host,
              port: connConfig.port
            }
          };

          break; // Salir del loop si la conexión fue exitosa
        } catch (error) {
          this.logger.warn(`⚠️ No se pudo conectar como ${connConfig.username}: ${error.message}`);
          if (dataSource?.isInitialized) {
            await dataSource.destroy();
          }
          continue; // Intentar siguiente configuración
        }
      }

      if (!availableResources) {
        throw new Error('No se pudo conectar al servidor con ninguna de las credenciales proporcionadas o comunes');
      }

      await dataSource.destroy();

      // Generar sugerencias inteligentes
      const suggestions = this.generateConnectionSuggestions(
        availableResources, 
        connectionData,
        connectionUsed
      );

      this.logger.log(`✅ Recursos descubiertos: ${availableResources.databases.length} BD, ${availableResources.users.length} usuarios`);

      return {
        success: true,
        resources: availableResources,
        suggestions,
        connectionUsed: {
          username: connectionUsed.username,
          database: connectionUsed.database
        },
        message: `Encontradas ${availableResources.databases.length} bases de datos y ${availableResources.users.length} usuarios`
      };

    } catch (error) {
      this.logger.error(`Error descubriendo recursos: ${error.message}`);
      throw new HttpException(`Error: ${error.message}`, HttpStatus.BAD_REQUEST);
    } finally {
      if (dataSource && dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
  }

  /**
   * Obtiene la versión del servidor de base de datos
   */
  private async getServerVersion(dataSource: any, dbType: string): Promise<string> {
    try {
      if (dbType === 'postgres') {
        const result = await dataSource.query('SELECT version()');
        return result[0].version.split(' ')[1];
      } else if (dbType === 'mysql') {
        const result = await dataSource.query('SELECT VERSION() as version');
        return result[0].version;
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Genera sugerencias inteligentes de conexión
   */
  private generateConnectionSuggestions(resources: any, originalData: any, connectionUsed: any): any[] {
    const suggestions = [];

    // Sugerencia 1: Usar la base de datos solicitada si existe
    const targetDb = resources.databases.find(db => 
      db.name.toLowerCase() === originalData.database.toLowerCase()
    );

    if (targetDb) {
      suggestions.push({
        type: 'exact_match',
        priority: 'high',
        title: `✅ Base de datos encontrada: ${targetDb.name}`,
        description: 'La base de datos que buscas existe en el servidor',
        config: {
          ...originalData,
          database: targetDb.name,
          username: connectionUsed.username
        }
      });
    }

    // Sugerencia 2: Buscar bases de datos similares
    const similarDbs = resources.databases.filter(db => 
      db.name.toLowerCase().includes(originalData.database.toLowerCase().split('_')[0]) ||
      originalData.database.toLowerCase().includes(db.name.toLowerCase())
    );

    similarDbs.forEach(db => {
      suggestions.push({
        type: 'similar_match',
        priority: 'medium',
        title: `🔍 Base de datos similar: ${db.name}`,
        description: 'Esta base de datos tiene un nombre similar al que buscas',
        config: {
          ...originalData,
          database: db.name,
          username: connectionUsed.username
        }
      });
    });

    // Sugerencia 3: Usar usuario específico si existe
    const targetUser = resources.users.find(user => 
      user.username.toLowerCase() === originalData.username.toLowerCase()
    );

    if (targetUser && !targetDb) {
      suggestions.push({
        type: 'user_exists',
        priority: 'medium',
        title: `👤 Usuario encontrado: ${targetUser.username}`,
        description: 'El usuario existe, pero necesitas especificar la base de datos correcta',
        config: {
          ...originalData,
          username: targetUser.username,
          database: resources.databases[0]?.name || 'postgres'
        }
      });
    }

    // Sugerencia 4: Opciones disponibles
    if (resources.databases.length > 0) {
      suggestions.push({
        type: 'available_options',
        priority: 'low',
        title: `📋 Bases de datos disponibles (${resources.databases.length})`,
        description: 'Todas las bases de datos disponibles en el servidor',
        config: {
          ...originalData,
          database: resources.databases[0].name,
          username: connectionUsed.username
        },
        options: resources.databases.map(db => ({
          name: db.name,
          size: db.size
        }))
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * GENERA contexto de IA automático para tablas detectadas
   */
  @Post('generate-ai-context')
  @ApiOperation({ 
    summary: 'Generar contexto de IA automático',
    description: 'Usa IA para generar contexto automático para las tablas detectadas'
  })
  async generateAIContext(@Body() requestData: any): Promise<any> {
    try {
      this.logger.log('🤖 Generando contexto automático de IA...');
      
      if (!requestData.tables || !Array.isArray(requestData.tables)) {
        throw new Error('Se requiere un array de tablas para generar contexto');
      }

      const enhancedTables = {};
      
      for (const table of requestData.tables) {
        this.logger.log(`🔍 Analizando tabla: ${table.name}`);
        
        const context = await this.generateTableContext(table);
        
        enhancedTables[table.mappedName || table.name] = {
          ...table,
          tableContext: context
        };
      }

      this.logger.log(`✅ Contexto generado para ${Object.keys(enhancedTables).length} tablas`);

      return {
        success: true,
        enhancedTables,
        message: `Contexto de IA generado para ${Object.keys(enhancedTables).length} tablas`
      };

    } catch (error) {
      this.logger.error(`Error generando contexto IA: ${error.message}`);
      throw new HttpException(`Error: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Genera contexto de IA específico para una tabla
   */
  private async generateTableContext(table: any): Promise<any> {
    const tableName = table.name || table.tableName;
    const columns = table.columns || [];
    const purpose = table.purpose || this.estimateTablePurpose(tableName);
    
    // Analizar tipos de columnas para generar contexto inteligente
    const columnAnalysis = this.analyzeTableColumns(columns);
    
    // Generar contexto basado en patrones de negocio
    const businessContext = this.generateBusinessContext(tableName, columns, purpose);
    
    // Generar instrucciones de consulta específicas
    const queryInstructions = this.generateQueryInstructions(tableName, columns, columnAnalysis);
    
    // Generar instrucciones de inserción específicas
    const insertInstructions = this.generateInsertInstructions(tableName, columns, columnAnalysis);
    
    // Generar lógica de negocio y validaciones
    const businessLogic = this.generateBusinessLogic(tableName, columns, columnAnalysis);
    
    // Generar consejos específicos para IA
    const aiTips = this.generateAITips(tableName, columns, columnAnalysis, purpose);

    return {
      purpose: businessContext.purpose,
      queryInstructions: queryInstructions.join('. '),
      insertInstructions: insertInstructions.join('. '),
      businessLogic: businessLogic.join('. '),
      aiTips: aiTips, // Devolver como array, no como string
      generatedAt: new Date().toISOString(),
      confidence: this.calculateContextConfidence(tableName, columns)
    };
  }

  /**
   * Analiza las columnas de una tabla para identificar patrones
   */
  private analyzeTableColumns(columns: any[]): any {
    const analysis = {
      hasId: false,
      hasTimestamps: false,
      hasStatus: false,
      hasAmounts: false,
      hasNames: false,
      hasReferences: false,
      keyColumns: [],
      dateColumns: [],
      textColumns: [],
      numericColumns: [],
      referenceColumns: []
    };

    columns.forEach(col => {
      const name = col.name.toLowerCase();
      const type = col.type.toLowerCase();

      // Identificar tipos de columnas importantes
      if (name.includes('id') || name === 'codigo') {
        analysis.hasId = true;
        analysis.keyColumns.push(col.name);
      }
      
      if (name.includes('fecha') || name.includes('date') || name.includes('created') || name.includes('updated')) {
        analysis.hasTimestamps = true;
        analysis.dateColumns.push(col.name);
      }
      
      if (name.includes('status') || name.includes('estado') || name.includes('activo')) {
        analysis.hasStatus = true;
      }
      
      if (name.includes('precio') || name.includes('total') || name.includes('amount') || name.includes('valor') || name.includes('costo')) {
        analysis.hasAmounts = true;
        analysis.numericColumns.push(col.name);
      }
      
      if (name.includes('nombre') || name.includes('name') || name.includes('titulo') || name.includes('descripcion')) {
        analysis.hasNames = true;
        analysis.textColumns.push(col.name);
      }
      
      if (name.includes('_id') && name !== 'id' || name.startsWith('id') && name !== 'id') {
        analysis.hasReferences = true;
        analysis.referenceColumns.push(col.name);
      }
    });

    return analysis;
  }

  /**
   * Genera contexto de negocio específico
   */
  private generateBusinessContext(tableName: string, columns: any[], purpose: string): any {
    const name = tableName.toLowerCase();
    let enhancedPurpose = purpose;

    // Mejorar el propósito basado en análisis detallado
    if (name.includes('client') || name.includes('cliente')) {
      enhancedPurpose = `Gestión completa de clientes del sistema. Almacena información personal, de contacto y comercial de los clientes. Es central para todas las operaciones de ventas y facturación.`;
    } else if (name.includes('encabedoc') || name.includes('encab')) {
      enhancedPurpose = `Documentos maestros del sistema (facturas, cotizaciones, órdenes). Cada registro representa un documento comercial con su información general antes de los detalles.`;
    } else if (name.includes('movimiento') || name.includes('detail')) {
      enhancedPurpose = `Detalles/líneas de los documentos comerciales. Cada registro representa un producto o servicio específico dentro de un documento maestro.`;
    } else if (name.includes('inventario') || name.includes('product')) {
      enhancedPurpose = `Control de inventario y productos. Gestiona stock, precios, códigos y toda la información de productos comercializables.`;
    } else if (name.includes('pago') || name.includes('payment')) {
      enhancedPurpose = `Gestión de pagos y transacciones financieras. Registra cómo y cuándo se realizan los pagos de los documentos.`;
    }

    return { purpose: enhancedPurpose };
  }

  /**
   * Genera instrucciones específicas de consulta
   */
  private generateQueryInstructions(tableName: string, columns: any[], analysis: any): string[] {
    const instructions = [];
    const name = tableName.toLowerCase();

    // Instrucciones generales
    instructions.push(`Para consultar ${tableName}, usa siempre la clave primaria para búsquedas exactas`);

    // Instrucciones específicas por tipo de tabla
    if (name.includes('client') || name.includes('cliente')) {
      instructions.push('Buscar clientes por nombre usando LIKE con % para coincidencias parciales');
      instructions.push('Verificar siempre el estado activo del cliente antes de procesar');
      if (analysis.hasTimestamps) {
        instructions.push('Incluir fechas de creación para auditoría');
      }
    } else if (name.includes('product') || name.includes('inventario')) {
      instructions.push('Verificar stock disponible antes de cualquier operación');
      instructions.push('Consultar por código de producto para búsquedas exactas');
      instructions.push('Usar filtros de categoría para búsquedas amplias');
    } else if (name.includes('encabedoc')) {
      instructions.push('Filtrar por rango de fechas para reportes');
      instructions.push('Incluir información del cliente en las consultas');
      instructions.push('Considerar el estado del documento (borrador, confirmado, anulado)');
    }

    // Instrucciones basadas en análisis de columnas
    if (analysis.hasStatus) {
      instructions.push('Filtrar siempre por estado activo/válido');
    }
    
    if (analysis.hasAmounts) {
      instructions.push('Incluir cálculos de totales cuando sea relevante');
    }

    return instructions;
  }

  /**
   * Genera instrucciones específicas de inserción
   */
  private generateInsertInstructions(tableName: string, columns: any[], analysis: any): string[] {
    const instructions = [];
    const name = tableName.toLowerCase();

    // Instrucciones generales
    instructions.push(`Al insertar en ${tableName}, validar siempre los campos requeridos`);

    // Instrucciones específicas por tipo
    if (name.includes('client') || name.includes('cliente')) {
      instructions.push('Validar formato de email y unicidad si aplicable');
      instructions.push('Asignar código único de cliente automáticamente');
      instructions.push('Establecer fecha de registro actual');
    } else if (name.includes('product') || name.includes('inventario')) {
      instructions.push('Generar código único de producto');
      instructions.push('Establecer stock inicial en cero si no se especifica');
      instructions.push('Validar categoría y unidad de medida');
    } else if (name.includes('encabedoc')) {
      instructions.push('Generar número consecutivo de documento');
      instructions.push('Validar existencia del cliente referenciado');
      instructions.push('Establecer fecha actual si no se proporciona');
      instructions.push('Calcular totales basado en los movimientos');
    } else if (name.includes('movimiento')) {
      instructions.push('Validar existencia del documento padre');
      instructions.push('Verificar disponibilidad de stock si es venta');
      instructions.push('Calcular subtotales automáticamente');
    }

    // Instrucciones basadas en análisis
    if (analysis.hasTimestamps) {
      instructions.push('Establecer timestamps de creación automáticamente');
    }
    
    if (analysis.hasReferences) {
      instructions.push('Validar integridad referencial de todas las FK');
    }

    return instructions;
  }

  /**
   * Genera lógica de negocio y validaciones
   */
  private generateBusinessLogic(tableName: string, columns: any[], analysis: any): string[] {
    const rules = [];
    const name = tableName.toLowerCase();

    // Reglas generales
    rules.push('Aplicar soft delete en lugar de eliminación física');

    // Reglas específicas por tipo
    if (name.includes('client') || name.includes('cliente')) {
      rules.push('No permitir eliminar clientes con documentos asociados');
      rules.push('Validar datos de contacto antes de guardar');
      rules.push('Mantener historial de cambios en información crítica');
    } else if (name.includes('product') || name.includes('inventario')) {
      rules.push('No permitir stock negativo');
      rules.push('Actualizar fechas de última modificación en cambios de precio');
      rules.push('Validar códigos únicos de producto');
    } else if (name.includes('encabedoc')) {
      rules.push('No permitir modificar documentos confirmados');
      rules.push('Validar totales contra suma de movimientos');
      rules.push('Generar numeración consecutiva automática');
    } else if (name.includes('movimiento')) {
      rules.push('Actualizar stock automáticamente en ventas');
      rules.push('Recalcular totales del documento padre');
      rules.push('Validar cantidades positivas');
    }

    // Reglas basadas en análisis
    if (analysis.hasAmounts) {
      rules.push('Validar que los montos sean positivos');
      rules.push('Usar precisión decimal apropiada para cálculos financieros');
    }
    
    if (analysis.hasStatus) {
      rules.push('Controlar transiciones de estado válidas');
    }

    return rules;
  }

  /**
   * Genera consejos específicos para el agente IA
   */
  private generateAITips(tableName: string, columns: any[], analysis: any, purpose: string): string[] {
    const tips = [];
    const name = tableName.toLowerCase();

    // Tips generales
    tips.push('Siempre confirmar la operación antes de ejecutar');
    tips.push('Proporcionar feedback claro del resultado');

    // Tips específicos por tipo
    if (name.includes('client') || name.includes('cliente')) {
      tips.push('Sugerir información faltante al crear clientes');
      tips.push('Mostrar resumen de actividad reciente del cliente');
      tips.push('Ofrecer búsqueda inteligente por nombre parcial');
    } else if (name.includes('product') || name.includes('inventario')) {
      tips.push('Alertar sobre stock bajo automáticamente');
      tips.push('Sugerir productos relacionados en búsquedas');
      tips.push('Mostrar historial de precios en consultas');
    } else if (name.includes('encabedoc')) {
      tips.push('Mostrar resumen financiero al crear documentos');
      tips.push('Sugerir productos frecuentes del cliente');
      tips.push('Validar límites de crédito automáticamente');
    } else if (name.includes('pago')) {
      tips.push('Calcular vueltos automáticamente');
      tips.push('Sugerir métodos de pago disponibles');
      tips.push('Confirmar montos antes de procesar');
    }

    // Tips basados en análisis
    if (analysis.hasAmounts) {
      tips.push('Formatear montos en la moneda local');
      tips.push('Mostrar cálculos paso a paso');
    }
    
    if (analysis.hasTimestamps) {
      tips.push('Mostrar fechas en formato amigable');
      tips.push('Incluir información temporal relevante');
    }

    return tips;
  }

  /**
   * Calcula nivel de confianza del contexto generado
   */
  private calculateContextConfidence(tableName: string, columns: any[]): number {
    let confidence = 0.5; // Base
    
    const name = tableName.toLowerCase();
    const columnCount = columns.length;
    
    // Boost por nombre reconocible
    if (name.includes('client') || name.includes('producto') || name.includes('encab') || name.includes('movimiento')) {
      confidence += 0.3;
    }
    
    // Boost por número de columnas (más contexto disponible)
    if (columnCount > 10) confidence += 0.1;
    if (columnCount > 20) confidence += 0.1;
    
    // Boost por patrones reconocidos en columnas
    const hasStandardFields = columns.some(col => 
      col.name.toLowerCase().includes('id') || 
      col.name.toLowerCase().includes('nombre') ||
      col.name.toLowerCase().includes('fecha')
    );
    
    if (hasStandardFields) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * APLICA configuración auto-detectada
   */
  @Post('apply-detected/:chatbotId')
  @ApiOperation({ 
    summary: 'Aplicar configuración auto-detectada',
    description: 'Aplica una configuración generada automáticamente'
  })
  async applyDetectedConfiguration(
    @Param('chatbotId') chatbotId: string,
    @Body() detectedConfig: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar que existe la configuración sugerida
      if (!detectedConfig || !detectedConfig.suggestedConfig) {
        throw new Error('No se encontró configuración sugerida en la solicitud');
      }

      const config = { ...detectedConfig.suggestedConfig };
      config.chatbotId = chatbotId;

      // Aplicar personalización si existe
      if (detectedConfig.customization?.description) {
        config.description = detectedConfig.customization.description;
      }

      this.logger.log(`Aplicando configuración para chatbot: ${chatbotId}`);
      await this.databaseMapper.registerDatabaseSchema(config);
      
      return { 
        success: true, 
        message: `Configuración aplicada exitosamente para chatbot: ${chatbotId}` 
      };
    } catch (error) {
      this.logger.error(`Error aplicando configuración: ${error.message}`);
      throw new HttpException(`Error: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':chatbotId/context')
  async getAgentContext(@Param('chatbotId') chatbotId: string): Promise<{ success: boolean; context: string }> {
    try {
      const context = this.databaseMapper.generateAgentContext(chatbotId);
      return { success: true, context };
    } catch (error) {
      throw new HttpException('Error obteniendo contexto', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async performConnectionTest(connectionData: DatabaseTestConnectionDto): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!connectionData.host || !connectionData.database) {
          reject(new Error('Host y base de datos requeridos'));
          return;
        }
        resolve();
      }, 1000);
    });
  }
}