/**
 * Servicio para auto-detección del esquema de base de datos
 * y generación automática de contextos específicos por tabla
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TableContextPrompts } from '../interfaces/table-context-prompts.interface';

export interface DetectedTable {
  name: string;
  primaryKey: string;
  columns: DetectedColumn[];
  relationships: DetectedRelationship[];
  estimatedPurpose: string;
  suggestedContextPrompts: TableContextPrompts;
}

export interface DetectedColumn {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimary: boolean;
  isForeign: boolean;
  defaultValue?: string;
  maxLength?: number;
  standardName?: string; // Nombre estandarizado para mapeo
}

export interface DetectedRelationship {
  localColumn: string;
  foreignTable: string;
  foreignColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

export interface DatabaseSchema {
  tables: DetectedTable[];
  relationships: DetectedRelationship[];
  totalTables: number;
  detectedPatterns: string[];
}

@Injectable()
export class SchemaDetectionService {
  private readonly logger = new Logger(SchemaDetectionService.name);

  /**
   * Detecta automáticamente el esquema de una base de datos
   */
  async detectDatabaseSchema(connectionConfig: any): Promise<DatabaseSchema> {
    let dataSource: DataSource;
    
    try {
      // Crear conexión temporal
      dataSource = new DataSource({
        type: connectionConfig.databaseType,
        host: connectionConfig.host,
        port: connectionConfig.port,
        username: connectionConfig.username,
        password: connectionConfig.password,
        database: connectionConfig.database,
        synchronize: false,
        logging: false
      });

      await dataSource.initialize();
      this.logger.log(`Conectado a ${connectionConfig.databaseType} para detección de esquema`);

      // Detectar tablas según el tipo de BD
      let tables: DetectedTable[] = [];
      
      if (connectionConfig.databaseType === 'postgres') {
        tables = await this.detectPostgreSQLSchema(dataSource);
      } else if (connectionConfig.databaseType === 'mysql') {
        tables = await this.detectMySQLSchema(dataSource);
      } else {
        throw new Error(`Tipo de BD no soportado para auto-detección: ${connectionConfig.databaseType}`);
      }

      // Analizar patrones y generar contextos
      const detectedPatterns = this.analyzeBusinessPatterns(tables);
      
      // Generar contextos específicos para cada tabla
      tables = tables.map(table => ({
        ...table,
        suggestedContextPrompts: this.generateContextForTable(table, tables)
      }));

      const schema: DatabaseSchema = {
        tables,
        relationships: [],
        totalTables: tables.length,
        detectedPatterns
      };

      this.logger.log(`Esquema detectado: ${tables.length} tablas, patrones: ${detectedPatterns.join(', ')}`);
      
      return schema;

    } catch (error) {
      this.logger.error(`Error detectando esquema: ${error.message}`);
      throw error;
    } finally {
      if (dataSource?.isInitialized) {
        await dataSource.destroy();
      }
    }
  }

  /**
   * Detecta esquema de PostgreSQL
   */
  private async detectPostgreSQLSchema(dataSource: DataSource): Promise<DetectedTable[]> {
    const query = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      LEFT JOIN (
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON t.table_name = pk.table_name AND c.column_name = pk.column_name
      LEFT JOIN (
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      ) fk ON t.table_name = fk.table_name AND c.column_name = fk.column_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.table_name IS NOT NULL
      ORDER BY t.table_name, c.ordinal_position
    `;

    const results = await dataSource.query(query);
    return this.groupResultsIntoTables(results);
  }

  /**
   * Detecta esquema de MySQL
   */
  private async detectMySQLSchema(dataSource: DataSource): Promise<DetectedTable[]> {
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

    const results = await dataSource.query(query);
    return this.groupResultsIntoTables(results);
  }

  /**
   * Agrupa los resultados por tabla
   */
  private groupResultsIntoTables(results: any[]): DetectedTable[] {
    const tablesMap = new Map<string, DetectedTable>();

    results.forEach(row => {
      const tableName = row.table_name;
      
      if (!tablesMap.has(tableName)) {
        tablesMap.set(tableName, {
          name: tableName,
          primaryKey: '',
          columns: [],
          relationships: [],
          estimatedPurpose: this.estimateTablePurpose(tableName),
          suggestedContextPrompts: null // Se generará después
        });
      }

      const table = tablesMap.get(tableName);
      
      const column: DetectedColumn = {
        name: row.column_name,
        type: row.data_type,
        isNullable: row.is_nullable === 'YES' || row.is_nullable === true,
        isPrimary: row.is_primary === true || row.is_primary === 1,
        isForeign: row.is_foreign === true || row.is_foreign === 1,
        defaultValue: row.column_default,
        maxLength: row.character_maximum_length,
        standardName: this.mapToStandardName(row.column_name, tableName)
      };

      table.columns.push(column);
      
      // Establecer clave primaria
      if (column.isPrimary && !table.primaryKey) {
        table.primaryKey = column.name;
      }
    });

    return Array.from(tablesMap.values());
  }

  /**
   * Estima el propósito de una tabla basado en su nombre
   */
  private estimateTablePurpose(tableName: string): string {
    const name = tableName.toLowerCase();
    
    // Patrones comunes
    if (name.includes('client') || name.includes('customer')) {
      return 'Gestión de clientes y información de contacto';
    }
    if (name.includes('product') || name.includes('item') || name.includes('inventario')) {
      return 'Control de inventario y productos';
    }
    if (name.includes('order') || name.includes('pedido') || name.includes('venta') || name.includes('encabedoc')) {
      return 'Gestión de órdenes y documentos de venta';
    }
    if (name.includes('detail') || name.includes('movimiento') || name.includes('item')) {
      return 'Líneas de detalle de documentos';
    }
    if (name.includes('pago') || name.includes('payment') || name.includes('metodo')) {
      return 'Métodos de pago y transacciones';
    }
    if (name.includes('user') || name.includes('usuario') || name.includes('colaborador')) {
      return 'Gestión de usuarios del sistema';
    }
    if (name.includes('categoria') || name.includes('category') || name.includes('tipo')) {
      return 'Categorización y clasificación';
    }
    if (name.includes('config') || name.includes('setting') || name.includes('param')) {
      return 'Configuración del sistema';
    }
    if (name.includes('log') || name.includes('audit') || name.includes('historial')) {
      return 'Auditoría y registro de actividades';
    }
    
    return `Tabla del sistema: ${tableName}`;
  }

  /**
   * Mapea nombres de columna a nombres estándar
   */
  private mapToStandardName(columnName: string, tableName: string): string {
    const col = columnName.toLowerCase();
    const table = tableName.toLowerCase();
    
    // IDs
    if (col.includes('id') && (col.includes('client') || col.includes('customer'))) return 'cliente_id';
    if (col.includes('id') && col.includes('product')) return 'producto_id';
    if (col.includes('id') && (col === 'id' || col.endsWith('_id') || col.startsWith('id'))) return 'id';
    
    // Nombres
    if (col.includes('nombre') || col.includes('name') || col.includes('titulo') || col.includes('title')) return 'nombre';
    if (col.includes('descripcion') || col.includes('description') || col.includes('desc')) return 'descripcion';
    
    // Contacto
    if (col.includes('email') || col.includes('correo') || col.includes('mail')) return 'email';
    if (col.includes('telefono') || col.includes('phone') || col.includes('tel')) return 'telefono';
    if (col.includes('direccion') || col.includes('address') || col.includes('addr')) return 'direccion';
    
    // Documentos de identidad
    if (col.includes('cedula') || col.includes('rif') || col.includes('dni') || col.includes('document')) return 'cedula';
    if (col.includes('codigo') || col.includes('code') || col.includes('sku')) return 'codigo';
    
    // Precios y cantidades
    if (col.includes('precio') || col.includes('price')) {
      if (col.includes('dolar') || col.includes('usd') || col.includes('dollar')) return 'precio_usd';
      if (col.includes('bolivar') || col.includes('bs') || col.includes('ves')) return 'precio_bs';
      return 'precio';
    }
    if (col.includes('cantidad') || col.includes('qty') || col.includes('stock') || col.includes('existencia')) return 'stock';
    if (col.includes('total') || col.includes('subtotal') || col.includes('monto')) return 'total';
    
    // Estados y flags
    if (col.includes('activo') || col.includes('active') || col.includes('enabled')) return 'activo';
    if (col.includes('status') || col.includes('estado') || col.includes('state')) return 'estado';
    
    // Fechas
    if (col.includes('fecha') || col.includes('date') || col.includes('created') || col.includes('updated')) return 'fecha';
    
    return columnName; // Devolver el nombre original si no hay mapeo
  }

  /**
   * Analiza patrones de negocio en las tablas detectadas
   */
  private analyzeBusinessPatterns(tables: DetectedTable[]): string[] {
    const patterns: string[] = [];
    const tableNames = tables.map(t => t.name.toLowerCase());
    
    // Detectar sistema de facturación
    if (tableNames.some(n => n.includes('client') || n.includes('customer') || n.includes('clientes')) &&
        tableNames.some(n => n.includes('product') || n.includes('inventario')) &&
        tableNames.some(n => n.includes('order') || n.includes('venta') || n.includes('encabedoc'))) {
      patterns.push('Sistema de Facturación');
    }
    
    // Detectar e-commerce
    if (tableNames.some(n => n.includes('cart') || n.includes('carrito')) ||
        tableNames.some(n => n.includes('payment') || n.includes('pago'))) {
      patterns.push('E-commerce');
    }
    
    // Detectar sistema de inventario
    if (tableNames.some(n => n.includes('inventario') || n.includes('stock')) &&
        tableNames.some(n => n.includes('deposito') || n.includes('warehouse'))) {
      patterns.push('Gestión de Inventario');
    }
    
    // Detectar sistema de delivery
    if (tableNames.some(n => n.includes('delivery') || n.includes('entrega'))) {
      patterns.push('Sistema de Delivery');
    }
    
    // Detectar sistema de pagos venezolano
    if (tableNames.some(n => n.includes('banco')) ||
        tableNames.some(n => n.includes('pago'))) {
      patterns.push('Pagos Venezuela');
    }
    
    return patterns;
  }

  /**
   * Genera contexto automático para una tabla
   */
  private generateContextForTable(table: DetectedTable, allTables: DetectedTable[]): TableContextPrompts {
    const tableName = table.name.toLowerCase();
    
    // Contexto específico según el tipo de tabla detectado
    if (tableName.includes('client') || tableName.includes('clientes')) {
      return this.generateClientTableContext(table);
    }
    if (tableName.includes('product') || tableName.includes('inventario')) {
      return this.generateProductTableContext(table);
    }
    if (tableName.includes('encabedoc') || tableName.includes('order') || tableName.includes('venta')) {
      return this.generateOrderTableContext(table);
    }
    if (tableName.includes('movimiento') || tableName.includes('detail') || tableName.includes('item')) {
      return this.generateDetailTableContext(table);
    }
    if (tableName.includes('pago') || tableName.includes('payment') || tableName.includes('metodo')) {
      return this.generatePaymentTableContext(table);
    }
    
    // Contexto genérico
    return this.generateGenericTableContext(table);
  }

  private generateClientTableContext(table: DetectedTable): TableContextPrompts {
    return {
      purpose: `Gestiona la información de clientes del sistema. Almacena datos de contacto, identificación y información comercial necesaria para las transacciones.`,
      queryInstructions: `Buscar clientes por nombre, cédula, RIF o teléfono usando LIKE con '%término%'. Filtrar por estado activo. Limitar resultados a 20 registros máximo.`,
      insertInstructions: `Campos obligatorios: nombre y documento de identidad (cédula/RIF). Validar formato de documentos venezolanos. Email y teléfono recomendados para contacto.`,
      updateInstructions: `Permite actualizar datos de contacto. El documento de identidad es inmutable. Confirmar cambios importantes con el cliente.`,
      relationshipGuidance: `Se relaciona con órdenes/ventas (1:N), pagos, y delivery. Un cliente puede tener múltiples transacciones.`,
      businessLogic: `Cliente inactivo mantiene historial pero no puede realizar nuevas compras. Documento de identidad debe ser único. Priorizar WhatsApp como contacto en Venezuela.`,
      criticalFields: ['nombre', 'cedula', 'rif', 'telefono'],
      usageExamples: [
        'Buscar cliente: "Busco el cliente Juan Pérez"',
        'Crear cliente: "Registrar nuevo cliente con cédula V12345678"',
        'Verificar duplicados: "¿Ya existe un cliente con esta cédula?"'
      ],
      aiTips: [
        'Siempre validar formato de cédula/RIF venezolano',
        'Preguntar por teléfono para delivery',
        'Confirmar datos antes de crear registros',
        'Usar cédula como identificador único principal'
      ]
    };
  }

  private generateProductTableContext(table: DetectedTable): TableContextPrompts {
    return {
      purpose: `Control de inventario y productos. Gestiona información de productos, precios, stock y características para la venta.`,
      queryInstructions: `Buscar por nombre, código o categoría. SIEMPRE verificar stock > 0 para productos disponibles. Mostrar precios actualizados.`,
      insertInstructions: `Código único obligatorio. Validar precios > 0. Stock inicial puede ser 0. Categoría recomendada para organización.`,
      updateInstructions: `Permite actualizar precios, stock y descripción. Código inmutable si hay transacciones previas. Validar stock antes de reducir.`,
      relationshipGuidance: `Se relaciona con líneas de venta (1:N), categorías, proveedores. Un producto puede estar en múltiples transacciones.`,
      businessLogic: `Stock 0 = agotado pero visible. Stock bajo genera alertas. Precios deben mantenerse actualizados según mercado.`,
      criticalFields: ['codigo', 'nombre', 'precio', 'stock'],
      usageExamples: [
        'Buscar producto: "¿Tienen paracetamol 500mg?"',
        'Verificar stock: "Cuántas unidades quedan del código ABC123"',
        'Crear producto: "Registrar nuevo producto con código XYZ789"'
      ],
      aiTips: [
        'Verificar stock antes de ofrecer productos',
        'Alertar si stock es bajo',
        'Mostrar código y precio claramente',
        'Sugerir alternativas si producto agotado'
      ]
    };
  }

  private generateOrderTableContext(table: DetectedTable): TableContextPrompts {
    return {
      purpose: `Gestiona órdenes de venta y documentos comerciales. Almacena información del encabezado de facturas, presupuestos y órdenes.`,
      queryInstructions: `Incluir JOIN con clientes para mostrar información completa. Filtrar por fecha, estado o cliente. Ordenar por fecha descendente.`,
      insertInstructions: `Requiere cliente válido, fecha actual, estado inicial. Generar número correlativo automático. Calcular totales desde líneas de detalle.`,
      updateInstructions: `Permite cambios de estado según flujo: PENDIENTE → PROCESANDO → COMPLETADO. No modificar documentos finalizados.`,
      relationshipGuidance: `Padre de líneas de detalle (1:N). Relacionado con clientes (N:1) y pagos (1:N).`,
      businessLogic: `Estado no puede retroceder. Total debe coincidir con suma de líneas. Fecha no puede ser futura.`,
      criticalFields: ['numero', 'cliente_id', 'total', 'estado', 'fecha'],
      usageExamples: [
        'Crear orden: "Nueva orden para cliente Juan Pérez"',
        'Consultar: "Órdenes pendientes de hoy"',
        'Cambiar estado: "Marcar orden #123 como completada"'
      ],
      aiTips: [
        'Validar cliente existe antes de crear',
        'Generar número correlativo siguiendo secuencia',
        'Informar cambios de estado al cliente',
        'Calcular totales automáticamente'
      ]
    };
  }

  private generateDetailTableContext(table: DetectedTable): TableContextPrompts {
    return {
      purpose: `Líneas de detalle de documentos de venta. Cada registro representa un producto específico dentro de una orden o factura.`,
      queryInstructions: `SIEMPRE incluir JOIN con productos para mostrar nombres. Agrupar por documento para resúmenes. Calcular subtotales.`,
      insertInstructions: `Verificar stock disponible antes de insertar. Usar precios actuales del producto. Calcular subtotal = cantidad × precio.`,
      updateInstructions: `Permite cambiar cantidad si hay stock suficiente. Recalcular subtotal y total del documento automáticamente.`,
      relationshipGuidance: `Hijo de documento principal (N:1). Relacionado con productos (N:1). Cada línea pertenece a un documento.`,
      businessLogic: `No permitir cantidad > stock disponible. Actualizar total del documento padre al modificar líneas.`,
      criticalFields: ['documento_id', 'producto_id', 'cantidad', 'precio_unitario'],
      usageExamples: [
        'Agregar línea: "Añadir 2 unidades de producto ABC a la orden #123"',
        'Modificar: "Cambiar cantidad a 5 unidades"',
        'Consultar: "¿Qué productos tiene la orden #123?"'
      ],
      aiTips: [
        'Verificar stock antes de agregar líneas',
        'Mostrar nombre del producto, no solo ID',
        'Recalcular totales al modificar',
        'Avisar si cambio afecta stock'
      ]
    };
  }

  private generatePaymentTableContext(table: DetectedTable): TableContextPrompts {
    return {
      purpose: `Métodos de pago y transacciones. Gestiona las formas de pago disponibles y registros de transacciones financieras.`,
      queryInstructions: `Filtrar por métodos activos. Mostrar descripción para que usuario comprenda opciones. Incluir validaciones específicas.`,
      insertInstructions: `Validar tipo de pago es válido. Para Venezuela: EFECTIVO, TRANSFERENCIA, PAGO_MOVIL, ZELLE, BINANCE. Activar por defecto.`,
      updateInstructions: `Permite activar/desactivar métodos. Cambiar descripción. Tipo de pago es inmutable.`,
      relationshipGuidance: `Referenciado por documentos de venta y registros de pago. Un método puede usarse en múltiples transacciones.`,
      businessLogic: `EFECTIVO = inmediato. TRANSFERENCIA/PAGO_MOVIL = requiere referencia. ZELLE/BINANCE = solo USD.`,
      criticalFields: ['nombre', 'tipo', 'activo'],
      usageExamples: [
        'Listar métodos: "¿Cómo puedo pagar?"',
        'Validar pago: "Quiero pagar por pago móvil"',
        'Procesar: "Pago en efectivo dólares"'
      ],
      aiTips: [
        'Solo mostrar métodos activos al cliente',
        'Explicar requisitos específicos de cada método',
        'Para ZELLE especificar que solo acepta USD',
        'Solicitar referencia para transferencias'
      ]
    };
  }

  private generateGenericTableContext(table: DetectedTable): TableContextPrompts {
    return {
      purpose: `Tabla del sistema: ${table.name}. ${table.estimatedPurpose}`,
      queryInstructions: `Consultar usando la clave primaria ${table.primaryKey}. Filtrar por campos relevantes usando LIKE o igualdad exacta.`,
      insertInstructions: `Completar campos obligatorios. Validar formato de datos según tipo de columna.`,
      updateInstructions: `Verificar permisos antes de modificar. La clave primaria es inmutable.`,
      relationshipGuidance: `Verificar relaciones con otras tablas antes de eliminar registros.`,
      businessLogic: `Aplicar validaciones estándar según el tipo de datos y reglas de negocio.`,
      criticalFields: [table.primaryKey],
      usageExamples: [`Consultar registro por ID`, `Crear nuevo registro`, `Actualizar información existente`],
      aiTips: [
        'Validar datos antes de insertar',
        'Usar clave primaria para identificación única',
        'Verificar relaciones antes de eliminar'
      ]
    };
  }
} 