import { Injectable, Logger } from '@nestjs/common';
import { DatabaseSchemaConfig, ColumnMapping, PredefinedQueries, AgentInstructions } from '../schemas/database-schema.interface';
import { ExternalDbService } from '../../external-db/external-db.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotInstance } from '../../admin/entities/chatbot-instance.entity';

@Injectable()
export class DatabaseMapperService {
  private readonly logger = new Logger(DatabaseMapperService.name);
  private schemaConfigs = new Map<string, DatabaseSchemaConfig>();

  constructor(
    private readonly externalDbService: ExternalDbService,
    @InjectRepository(ChatbotInstance, 'users')
    private chatbotInstanceRepository: Repository<ChatbotInstance>
  ) {
    this.loadStoredConfigurations();
  }

  /**
   * Carga las configuraciones almacenadas en la base de datos al iniciar
   */
  private async loadStoredConfigurations(): Promise<void> {
    try {
      this.logger.log('🔄 Cargando configuraciones de BD desde la base de datos...');
      const chatbots = await this.chatbotInstanceRepository.find();
      
      let loadedCount = 0;
      for (const chatbot of chatbots) {
        try {
          // Solo procesar chatbots con campo dbMappingConfig
          if (chatbot.dbMappingConfig) {
            const config = typeof chatbot.dbMappingConfig === 'string'
              ? JSON.parse(chatbot.dbMappingConfig)
              : chatbot.dbMappingConfig;
            
            if (config && config.chatbotId) {
              this.schemaConfigs.set(config.chatbotId, config);
              loadedCount++;
            }
          }
        } catch (err) {
          this.logger.error(`Error procesando configuración para chatbot ${chatbot.id}: ${err.message}`);
        }
      }
      
      this.logger.log(`✅ Cargadas ${loadedCount} configuraciones de mapeo de BD`);
    } catch (error) {
      this.logger.error(`❌ Error cargando configuraciones: ${error.message}`);
    }
  }

  /**
   * Registra la configuración de esquema para un chatbot
   */
  async registerDatabaseSchema(config: DatabaseSchemaConfig): Promise<void> {
    try {
      // Validar la configuración
      this.validateSchemaConfig(config);
      
      // Guardar la configuración en memoria
      this.schemaConfigs.set(config.chatbotId, config);
      
      // Persistir en la base de datos
      await this.persistSchemaConfig(config);
      
      this.logger.log(`✅ Esquema de BD registrado para chatbot: ${config.chatbotId}`);
    } catch (error) {
      this.logger.error(`❌ Error registrando esquema de BD: ${error.message}`);
      throw error;
    }
  }

  /**
   * Persiste la configuración en la base de datos
   */
  private async persistSchemaConfig(config: DatabaseSchemaConfig): Promise<void> {
    try {
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { id: config.chatbotId }
      });

      if (chatbot) {
        chatbot.dbMappingConfig = config;
        await this.chatbotInstanceRepository.save(chatbot);
        this.logger.log(`💾 Configuración persistida en la BD para chatbot: ${config.chatbotId}`);
      } else {
        throw new Error(`Chatbot no encontrado: ${config.chatbotId}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error persistiendo configuración: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene la configuración de esquema para un chatbot
   */
  getDatabaseSchema(chatbotId: string): DatabaseSchemaConfig | null {
    return this.schemaConfigs.get(chatbotId) || null;
  }

  /**
   * Obtiene todas las configuraciones de esquema registradas
   */
  getAllDatabaseSchemas(): DatabaseSchemaConfig[] {
    return Array.from(this.schemaConfigs.values());
  }

  /**
   * Elimina la configuración de esquema para un chatbot
   */
  async removeDatabaseSchema(chatbotId: string): Promise<boolean> {
    try {
      // Comprobar si existe
      const exists = this.schemaConfigs.has(chatbotId);
      if (!exists) {
        this.logger.warn(`⚠️ No existe configuración para eliminar: ${chatbotId}`);
        return false;
      }
      
      // Eliminar de memoria
      this.schemaConfigs.delete(chatbotId);
      this.logger.log(`🗑️ Configuración eliminada de memoria: ${chatbotId}`);
      
      // Eliminar de la base de datos
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { id: chatbotId }
      });
      
      if (chatbot) {
        chatbot.dbMappingConfig = null;
        await this.chatbotInstanceRepository.save(chatbot);
        this.logger.log(`🗑️ Configuración eliminada de la BD: ${chatbotId}`);
      } else {
        this.logger.warn(`⚠️ No se encontró chatbot en BD para eliminar config: ${chatbotId}`);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`❌ Error eliminando configuración: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera instrucciones contextuales para el agente IA
   */
  generateAgentContext(chatbotId: string): string {
    const schema = this.getDatabaseSchema(chatbotId);
    if (!schema) {
      return "No hay configuración de base de datos externa disponible.";
    }

    return this.buildAgentContextString(schema);
  }

  /**
   * Mapea un campo estándar a su nombre real en la BD
   */
  mapStandardFieldToActual(chatbotId: string, tableName: string, standardFieldName: string): string {
    const schema = this.getDatabaseSchema(chatbotId);
    if (!schema || !schema.tables[tableName]) {
      return standardFieldName; // Fallback al nombre estándar
    }

    const column = schema.tables[tableName].columns.find(
      col => col.standardName === standardFieldName
    );

    return column ? column.actualColumnName : standardFieldName;
  }

  /**
   * Obtiene una consulta SQL predefinida y la adapta al esquema actual
   */
  getAdaptedQuery(chatbotId: string, queryName: keyof PredefinedQueries, params?: any): string {
    const schema = this.getDatabaseSchema(chatbotId);
    if (!schema) {
      throw new Error(`No se encontró configuración de BD para chatbot: ${chatbotId}`);
    }

    let query = schema.queries[queryName];
    if (!query) {
      throw new Error(`Consulta no encontrada: ${queryName}`);
    }

    // Reemplazar placeholders con nombres reales de columnas y tablas
    query = this.replacePlaceholders(query, schema, params);

    return query;
  }

  /**
   * Valida datos según las reglas del esquema
   */
  validateData(chatbotId: string, tableName: string, data: any): { isValid: boolean; errors: string[] } {
    const schema = this.getDatabaseSchema(chatbotId);
    if (!schema || !schema.tables[tableName]) {
      return { isValid: false, errors: ['Configuración de tabla no encontrada'] };
    }

    const errors: string[] = [];
    const table = schema.tables[tableName];

    // Validar cada campo
    for (const column of table.columns) {
      const value = data[column.standardName];
      
      // Validar campos requeridos
      if (column.required && (value === undefined || value === null || value === '')) {
        errors.push(`El campo ${column.standardName} es requerido`);
        continue;
      }

      // Validar tipo de dato
      if (value !== undefined && !this.validateDataType(value, column.dataType)) {
        errors.push(`El campo ${column.standardName} debe ser de tipo ${column.dataType}`);
      }

      // Validaciones personalizadas
      if (column.validation && value !== undefined) {
        const validationErrors = this.validateField(value, column.validation, column.standardName);
        errors.push(...validationErrors);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Genera instrucciones específicas para una acción
   */
  getActionInstructions(chatbotId: string, action: string, context?: any): string {
    const schema = this.getDatabaseSchema(chatbotId);
    if (!schema) {
      return "Configuración de base de datos no disponible.";
    }

    const instructions = schema.agentInstructions;
    let actionInstructions = "";

    switch (action) {
      case 'buscar_cliente':
        actionInstructions = instructions.clienteManagement.searchInstructions;
        break;
      case 'crear_cliente':
        actionInstructions = instructions.clienteManagement.createInstructions;
        break;
      case 'buscar_productos':
        actionInstructions = instructions.productoManagement.searchInstructions;
        break;
      case 'crear_documento':
        const docType = context?.documentType || 'factura';
        const docConfig = instructions.documentManagement.documentTypes.find(dt => dt.type === docType);
        actionInstructions = docConfig ? 
          `Para crear ${docType}: Campos requeridos: ${docConfig.requiredFields.join(', ')}. Prefijo: ${docConfig.prefix}` :
          "Tipo de documento no configurado";
        break;
      default:
        actionInstructions = instructions.generalContext;
    }

    return actionInstructions;
  }

  /**
   * Obtiene el mapeo de campos para una tabla
   */
  getFieldMapping(chatbotId: string, tableName: string): { [standardName: string]: string } {
    const schema = this.getDatabaseSchema(chatbotId);
    if (!schema || !schema.tables[tableName]) {
      return {};
    }

    const mapping: { [standardName: string]: string } = {};
    for (const column of schema.tables[tableName].columns) {
      mapping[column.standardName] = column.actualColumnName;
    }

    return mapping;
  }

  /**
   * Genera contexto específico para una tabla
   */
  generateTableContext(chatbotId: string, tableName: string): string {
    const schema = this.getDatabaseSchema(chatbotId);
    if (!schema || !schema.tables[tableName]) {
      return `Tabla ${tableName} no encontrada.`;
    }

    const table = schema.tables[tableName];
    const context = [];

    // Información básica de la tabla
    context.push(`🗂️ TABLA: ${tableName.toUpperCase()} (${table.tableName})`);
    context.push(`Clave primaria: ${table.primaryKey}`);
    context.push("");

    // Contexto específico de la tabla si existe
    if (table.tableContext) {
      const tc = table.tableContext;
      
      context.push("📋 PROPÓSITO:");
      context.push(tc.purpose);
      context.push("");

      context.push("🔍 CÓMO CONSULTAR:");
      context.push(tc.queryInstructions);
      context.push("");

      context.push("➕ CÓMO INSERTAR:");
      context.push(tc.insertInstructions);
      context.push("");

      if (tc.updateInstructions) {
        context.push("✏️ CÓMO ACTUALIZAR:");
        context.push(tc.updateInstructions);
        context.push("");
      }

      context.push("🔗 RELACIONES:");
      context.push(tc.relationshipGuidance);
      context.push("");

      context.push("⚡ LÓGICA DE NEGOCIO:");
      context.push(tc.businessLogic);
      context.push("");

      if (tc.criticalFields.length > 0) {
        context.push("🚨 CAMPOS CRÍTICOS:");
        tc.criticalFields.forEach(field => context.push(`- ${field}`));
        context.push("");
      }

      if (tc.usageExamples.length > 0) {
        context.push("💡 EJEMPLOS DE USO:");
        tc.usageExamples.forEach(example => context.push(`- ${example}`));
        context.push("");
      }

      if (tc.aiTips.length > 0) {
        context.push("🤖 CONSEJOS PARA LA IA:");
        tc.aiTips.forEach(tip => context.push(`- ${tip}`));
        context.push("");
      }
    }

    // Detalles de campos
    context.push("📊 CAMPOS DISPONIBLES:");
    for (const column of table.columns) {
      const required = column.required ? " (REQUERIDO)" : "";
      context.push(`- ${column.standardName} → ${column.actualColumnName} (${column.dataType})${required}`);
      if (column.description) {
        context.push(`  ${column.description}`);
      }
    }

    return context.join('\n');
  }

  // Métodos privados

  private validateSchemaConfig(config: DatabaseSchemaConfig): void {
    if (!config.chatbotId) {
      throw new Error('chatbotId es requerido');
    }

    if (!config.tables) {
      throw new Error('Configuración de tablas es requerida');
    }

    // Validación flexible: al menos una tabla debe estar configurada
    const tableCount = Object.keys(config.tables).length;
    if (tableCount === 0) {
      throw new Error('Al menos una tabla debe estar configurada');
    }

    this.logger.log(`✅ Configuración válida: ${tableCount} tablas configuradas para ${config.chatbotId}`);
  }

  private buildAgentContextString(schema: DatabaseSchemaConfig): string {
    const context = [];
    
    context.push("=== CONFIGURACIÓN DE BASE DE DATOS EXTERNA ===");
    context.push(`Tipo de BD: ${schema.databaseType}`);
    context.push(`Descripción: ${schema.description || 'No especificada'}`);
    context.push("");

    // Instrucciones generales primero
    context.push("=== INSTRUCCIONES GENERALES ===");
    if (schema.agentInstructions && schema.agentInstructions.generalContext) {
      context.push(schema.agentInstructions.generalContext);
    } else {
      context.push("Sistema de gestión empresarial. Mantén un tono profesional y amigable.");
    }
    context.push("");

    // Contexto específico por tabla - NUEVA FUNCIONALIDAD MEJORADA
    context.push("=== CONTEXTO ESPECÍFICO POR TABLA ===");
    for (const [tableName, tableSchema] of Object.entries(schema.tables)) {
      // Si tiene contexto específico, usarlo; sino, usar información básica
      if (tableSchema.tableContext) {
        const tc = tableSchema.tableContext;
        context.push(`🗂️ TABLA: ${tableName.toUpperCase()} (${tableSchema.tableName})`);
        context.push(`📋 PROPÓSITO: ${tc.purpose}`);
        context.push(`🔍 CONSULTAS: ${tc.queryInstructions}`);
        context.push(`➕ INSERCIÓN: ${tc.insertInstructions}`);
        context.push(`🔗 RELACIONES: ${tc.relationshipGuidance}`);
        context.push(`⚡ LÓGICA: ${tc.businessLogic}`);
        
        if (tc.criticalFields.length > 0) {
          context.push(`🚨 CAMPOS CRÍTICOS: ${tc.criticalFields.join(', ')}`);
        }
        
        if (tc.aiTips.length > 0) {
          context.push(`🤖 CONSEJOS: ${tc.aiTips.join(' | ')}`);
        }
      } else {
        // Información básica si no hay contexto específico
        context.push(`📋 Tabla: ${tableName} (${tableSchema.tableName})`);
        context.push(`   Clave primaria: ${tableSchema.primaryKey}`);
        context.push("   Campos disponibles:");
        
        for (const column of tableSchema.columns) {
          const required = column.required ? " (REQUERIDO)" : "";
          context.push(`   - ${column.standardName} → ${column.actualColumnName} (${column.dataType})${required}`);
          if (column.description) {
            context.push(`     ${column.description}`);
          }
        }
      }
      context.push("");
    }

    // Instrucciones funcionales clásicas (mantenidas para compatibilidad)
    context.push("=== FUNCIONALIDADES DISPONIBLES ===");
    
    context.push("📞 GESTIÓN DE CLIENTES:");
    if (schema.agentInstructions?.clienteManagement) {
      context.push(`- Búsqueda: ${schema.agentInstructions.clienteManagement.searchInstructions || 'Buscar clientes por nombre o ID'}`);
      context.push(`- Creación: ${schema.agentInstructions.clienteManagement.createInstructions || 'Crear nuevos clientes con datos completos'}`);
    } else {
      context.push("- Búsqueda: Buscar clientes por nombre o ID");
      context.push("- Creación: Crear nuevos clientes con datos completos");
    }
    context.push("");

    context.push("🛍️ GESTIÓN DE PRODUCTOS:");
    if (schema.agentInstructions?.productoManagement) {
      context.push(`- Búsqueda: ${schema.agentInstructions.productoManagement.searchInstructions || 'Buscar productos por nombre o código'}`);
      context.push(`- Stock: ${schema.agentInstructions.productoManagement.stockValidation || 'Verificar disponibilidad antes de vender'}`);
    } else {
      context.push("- Búsqueda: Buscar productos por nombre o código");
      context.push("- Stock: Verificar disponibilidad antes de vender");
    }
    context.push("");

    context.push("📄 GESTIÓN DE DOCUMENTOS:");
    if (schema.agentInstructions?.documentManagement?.documentTypes?.length > 0) {
      for (const docType of schema.agentInstructions.documentManagement.documentTypes) {
        context.push(`- ${docType.type}: Prefijo ${docType.prefix}, Campos requeridos: ${docType.requiredFields.join(', ')}`);
      }
    } else {
      context.push("- Facturas: Crear documentos de venta con datos completos");
      context.push("- Presupuestos: Generar cotizaciones para clientes");
    }

    // ⭐ AGREGAR INSTRUCCIONES ESPECÍFICAS PARA CONSULTAS DE PRODUCTOS CON IA
    if (schema.tables.inventario || schema.tables.productos) {
      context.push("");
      context.push("🤖 INSTRUCCIONES ESPECIALES PARA CONSULTAS DE PRODUCTOS:");
      context.push("- Cuando el usuario pregunte por productos específicos (ej. 'harina pan', 'aceite', 'azúcar'), ejecuta una consulta real en la base de datos");
      context.push("- Para consultar productos, usa este formato EXACTO en tu respuesta:");
      context.push("");
      context.push("  **EJECUTAR_CONSULTA_PRODUCTO:**");
      context.push("  - Producto: [nombre del producto que solicita el usuario]");
      context.push("  - Marca: [marca específica si la menciona, o null]");
      context.push("");
      context.push("- Ejemplo cuando pregunten por 'harina pan':");
      context.push("  'Te ayudo a buscar harina pan en nuestro inventario.'");
      context.push("");
      context.push("  **EJECUTAR_CONSULTA_PRODUCTO:**");
      context.push("  - Producto: harina pan");
      context.push("  - Marca: null");
      context.push("");
      context.push("- Ejemplo si preguntan por 'aceite mazola':");
      context.push("  'Voy a consultar si tenemos aceite mazola disponible.'");
      context.push("");
      context.push("  **EJECUTAR_CONSULTA_PRODUCTO:**");
      context.push("  - Producto: aceite");
      context.push("  - Marca: mazola");
      context.push("");
      context.push("🚨 REGLAS IMPORTANTES:");
      context.push("- NUNCA inventes precios o productos que no tienes confirmados");
      context.push("- SIEMPRE usa el formato EJECUTAR_CONSULTA_PRODUCTO cuando pregunten por productos específicos");
      context.push("- Mantén un tono amigable y natural");
      context.push("- Si no es una consulta de producto, responde normalmente");
    }

    return context.join('\n');
  }

  private replacePlaceholders(query: string, schema: DatabaseSchemaConfig, params?: any): string {
    let adaptedQuery = query;

    // Reemplazar nombres de tablas
    for (const [standardName, tableSchema] of Object.entries(schema.tables)) {
      const placeholder = `{{${standardName}}}`;
      adaptedQuery = adaptedQuery.replace(new RegExp(placeholder, 'g'), tableSchema.tableName);
    }

    // Reemplazar nombres de columnas
    for (const [tableName, tableSchema] of Object.entries(schema.tables)) {
      for (const column of tableSchema.columns) {
        const placeholder = `{{${tableName}.${column.standardName}}}`;
        adaptedQuery = adaptedQuery.replace(
          new RegExp(placeholder, 'g'), 
          `${tableSchema.tableName}.${column.actualColumnName}`
        );
      }
    }

    // Reemplazar parámetros dinámicos
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        const placeholder = `{${key}}`;
        adaptedQuery = adaptedQuery.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    return adaptedQuery;
  }

  private validateDataType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'boolean':
        return typeof value === 'boolean';
      case 'json':
        try {
          if (typeof value === 'object') return true;
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  private validateField(value: any, validation: any, fieldName: string): string[] {
    const errors: string[] = [];

    if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
      errors.push(`${fieldName} no cumple con el patrón requerido`);
    }

    if (validation.minLength && value.length < validation.minLength) {
      errors.push(`${fieldName} debe tener al menos ${validation.minLength} caracteres`);
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      errors.push(`${fieldName} no puede tener más de ${validation.maxLength} caracteres`);
    }

    if (validation.minValue && value < validation.minValue) {
      errors.push(`${fieldName} debe ser mayor o igual a ${validation.minValue}`);
    }

    if (validation.maxValue && value > validation.maxValue) {
      errors.push(`${fieldName} debe ser menor o igual a ${validation.maxValue}`);
    }

    if (validation.allowedValues && !validation.allowedValues.includes(value)) {
      errors.push(`${fieldName} debe ser uno de: ${validation.allowedValues.join(', ')}`);
    }

    return errors;
  }

  // NUEVOS MÉTODOS PARA CONSULTAS SQL REALES

  // Campo privado para conexiones de BD (necesario para executeQuery)
  private databaseConfigs = new Map<string, any>();

  /**
   * NUEVO: Registrar conexión de base de datos externa
   */
  registerDatabaseConnection(chatbotId: string, connection: any): void {
    this.databaseConfigs.set(chatbotId, { connection });
    this.logger.log(`🔗 Conexión de BD registrada para chatbot: ${chatbotId}`);
  }

  /**
   * NUEVO: Obtener conexión de base de datos
   */
  getDatabaseConnection(chatbotId: string): any {
    const config = this.databaseConfigs.get(chatbotId);
    return config ? config.connection : null;
  }

  /**
   * NUEVO: Ejecutar consultas SQL reales en la base de datos externa
   */
  async executeQuery(chatbotId: string, queryAlias: string, params: any = {}): Promise<any> {
    try {
      // Construir la consulta SQL
      const sqlQuery = this.buildSqlQuery(queryAlias, params);
      
      this.logger.log(`🔍 Ejecutando consulta en BD externa: ${queryAlias}`);
      this.logger.log(`📝 SQL: ${sqlQuery.substring(0, 200)}...`);

      // Ejecutar la consulta usando ExternalDbService
      const result = await this.externalDbService.ejecutarQuery(sqlQuery, [], chatbotId);
      
      this.logger.log(`✅ Consulta ejecutada exitosamente. Filas: ${result.length}`);
      
      return {
        success: true,
        data: result,
        rowCount: result.length
      };

    } catch (error) {
      this.logger.error(`❌ Error ejecutando consulta ${queryAlias}: ${error.message}`);
      throw error;
    }
  }

  /**
   * NUEVO: Constructor de consultas SQL siguiendo el patrón del manual n8n
   */
  private buildSqlQuery(queryAlias: string, params: any): string {
    const { consulta, marca } = params;
    
    // Normalizar texto (función del manual n8n)
    const normalizedSearchTerm = consulta ? this.normalizeTextForSql(consulta) : null;
    const searchTermsArray = normalizedSearchTerm ? normalizedSearchTerm.split(' ').filter(t => t) : [];
    const normalizedMarcaTerm = marca ? this.normalizeTextForSql(marca) : null;
    const firstWord = searchTermsArray.length > 0 ? searchTermsArray[0] : null;

    // Validaciones
    if (queryAlias.startsWith('consulta_inventario')) {
      if (!consulta) {
        throw new Error(`No se proporcionó un término de búsqueda para ${queryAlias}`);
      }
      if (!normalizedSearchTerm || normalizedSearchTerm.trim() === '') {
        throw new Error(`El término de búsqueda '${consulta}' resultó vacío después de la normalización`);
      }
    }

    // Consultas permitidas (siguiendo el patrón del manual)
    const allowedQueries: Record<string, string> = {};

    // ALIAS: consulta_inventario_termino_simple
    if (queryAlias === 'consulta_inventario_termino_simple') {
      if (firstWord && firstWord !== '') {
        let marcaCondition = "";
        if (normalizedMarcaTerm && normalizedMarcaTerm.trim() !== '') {
          marcaCondition = `AND LOWER(nombre) ILIKE '%${normalizedMarcaTerm}%'`;
        }
        allowedQueries[queryAlias] = `
          SELECT
            codigo,
            nombre,
            preciounidad,
            alicuotaiva,
            existenciaunidad,
            (SELECT factorcambio FROM monedas WHERE codmoneda = '02' LIMIT 1) AS tasa_actual
          FROM inventario
          WHERE (
            SPLIT_PART(LOWER(nombre), ' ', 1) = '${firstWord}' OR
            LOWER(nombre) LIKE '${firstWord} %' OR
            LOWER(nombre) = '${firstWord}'
          )
          ${marcaCondition}
          AND existenciaunidad > 2
          ORDER BY
            CASE WHEN SPLIT_PART(LOWER(nombre), ' ', 1) = '${firstWord}' THEN 0 ELSE 1 END,
            LENGTH(nombre),
            nombre
          LIMIT 10;
        `;
      } else {
        throw new Error(`No se pudo extraer la primera palabra para la búsqueda (original: '${consulta}')`);
      }
    }

    // ALIAS: consulta_inventario_palabras_multiples o consulta_inventario
    if (queryAlias === 'consulta_inventario_palabras_multiples' || queryAlias === 'consulta_inventario') {
      if (normalizedSearchTerm && searchTermsArray.length > 0) {
        const ilikeConditions = searchTermsArray.map(term => `LOWER(nombre) ILIKE '%${term}%'`).join(' AND ');
        const firstTermForOrderBy = searchTermsArray[0];
        let marcaCondition = "";
        if (normalizedMarcaTerm && normalizedMarcaTerm.trim() !== '') {
          marcaCondition = `AND LOWER(nombre) ILIKE '%${normalizedMarcaTerm}%'`;
        }
        allowedQueries[queryAlias] = `
          SELECT
            codigo,
            nombre,
            preciounidad,
            alicuotaiva,
            existenciaunidad,
            (SELECT factorcambio FROM monedas WHERE codmoneda = '02' LIMIT 1) AS tasa_actual
          FROM inventario
          WHERE
            ${ilikeConditions}
            ${marcaCondition}
            AND existenciaunidad > 2
          ORDER BY
            CASE WHEN LOWER(nombre) ILIKE '%${firstTermForOrderBy}%' THEN 0 ELSE 1 END,
            nombre ASC
          LIMIT 10;
        `;
      } else {
        throw new Error(`No hay términos de búsqueda válidos para consulta múltiple (original: '${consulta}')`);
      }
    }

    // Otras consultas básicas
    allowedQueries['consulta_clientes_todos_limite'] = 'SELECT codigocliente, nombre, telefono1 FROM clientes LIMIT 10;';
    allowedQueries['consulta_tasa_dolar'] = "SELECT factorcambio FROM monedas WHERE codmoneda = '02' LIMIT 1;";

    if (queryAlias === 'consulta_cliente_por_cedula') {
      if (normalizedSearchTerm && normalizedSearchTerm.trim() !== '') {
        allowedQueries[queryAlias] = `
          SELECT codigocliente, nombre, direccion1, telefono1, status 
          FROM clientes WHERE codigocliente = '${normalizedSearchTerm}' LIMIT 1;`;
      } else {
        throw new Error(`Se requiere un valor para la cédula en '${queryAlias}'. Original: '${consulta}'`);
      }
    }

    if (queryAlias === 'consulta_cliente_por_telefono') {
      if (normalizedSearchTerm && normalizedSearchTerm.trim() !== '') {
        allowedQueries[queryAlias] = `
          SELECT codigocliente, nombre, direccion1, telefono1, status 
          FROM clientes WHERE telefono1 = '${normalizedSearchTerm}' LIMIT 1;`;
      } else {
        throw new Error(`Se requiere un valor para el teléfono en '${queryAlias}'. Original: '${consulta}'`);
      }
    }

    // Obtener la consulta final
    let finalQuery = allowedQueries[queryAlias] || queryAlias;

    if (!finalQuery || typeof finalQuery !== 'string' || finalQuery.trim() === '') {
      throw new Error(`La consulta final está vacía. Query Alias: '${queryAlias}'`);
    }

    // Validaciones de seguridad
    if (!allowedQueries[queryAlias]) { // SQL directo
      if (!finalQuery.trim().toLowerCase().startsWith('select')) {
        throw new Error(`Consulta directa no permitida. Solo SELECT. Query: "${finalQuery.substring(0, 100)}..."`);
      }
    } else { // Alias
      if (!finalQuery.trim().toLowerCase().startsWith('select') && !finalQuery.trim().toLowerCase().startsWith('with')) {
        throw new Error(`El alias "${queryAlias}" no generó una consulta válida`);
      }
    }

    return finalQuery.trim();
  }

  /**
   * NUEVO: Normalizar texto para SQL (función del manual n8n)
   */
  private normalizeTextForSql(text: string): string {
    if (typeof text !== 'string' || !text) return "";
    let normalized = text.toLowerCase();
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const map = { 'ñ': 'n', 'ç': 'c' };
    for (const c in map) normalized = normalized.replace(new RegExp(c, 'g'), map[c]);
    normalized = normalized.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
    return normalized.trim().replace(/'/g, "''"); // Escapar comillas simples para SQL
  }

  /**
   * NUEVO: Formatear resultados de productos para el usuario
   */
  async formatProductResults(queryResults: any[], searchTerm: string, tasaActual: number = 38.5): Promise<string> {
    if (!queryResults || queryResults.length === 0) {
      return `😔 Disculpa, no encontré "${searchTerm}" disponible en este momento. ¿Deseas probar otra marca o presentación?`;
    }

    let response = `🏪 **Aquí tienes algunas opciones de ${searchTerm}**:\n\n`;

    queryResults.forEach((producto, index) => {
      const precioUsd = parseFloat(producto.preciounidad) || 0;
      const alicuotaIva = parseFloat(producto.alicuotaiva) || 0;
      const tasa = parseFloat(producto.tasa_actual) || tasaActual;
      
      // Calcular precio en Bs con IVA
      const precioBs = precioUsd * tasa * (1 + alicuotaIva / 100);
      
      response += `${index + 1}. **${producto.nombre}**\n`;
      response += `   💵 Precio USD (ref): $${precioUsd.toFixed(2)}\n`;
      response += `   🇻🇪 Precio Bs: ${precioBs.toFixed(1)}\n\n`;
    });

    response += `👉 ¿Cuál deseas agregar al carrito? Puedes decirme el número o el nombre.`;

    return response;
  }

  /**
   * NUEVO: Determinar el tipo de consulta basado en el término de búsqueda
   */
  determineQueryType(searchTerm: string): string {
    if (!searchTerm || searchTerm.trim() === '') {
      throw new Error('Término de búsqueda vacío');
    }

    const normalizedTerm = this.normalizeTextForSql(searchTerm);
    const words = normalizedTerm.split(' ').filter(w => w.trim() !== '');

    // Si es una sola palabra genérica, usar búsqueda simple optimizada
    if (words.length === 1) {
      return 'consulta_inventario_termino_simple';
    }

    // Si son múltiples palabras, usar búsqueda por palabras múltiples
    return 'consulta_inventario_palabras_multiples';
  }
}