export interface DatabaseSchemaConfig {
  // Información básica de la BD
  chatbotId: string;
  databaseType: 'mysql' | 'postgres' | 'mssql' | 'oracle';
  description?: string;

  // Mapeo de tablas principales
  tables: {
    clientes: TableSchema;
    productos: TableSchema;
    encabezadoDoc: TableSchema;
    movimientosDoc: TableSchema;
    metodosPago: TableSchema;
    [customTable: string]: TableSchema; // Para tablas adicionales
  };

  // Relaciones entre tablas
  relationships: DatabaseRelationship[];

  // Consultas predefinidas comunes
  queries: PredefinedQueries;

  // Instrucciones específicas para el agente IA
  agentInstructions: AgentInstructions;

  // Validaciones y reglas de negocio
  businessRules: BusinessRules[];
}

export interface TableSchema {
  tableName: string;
  primaryKey: string;
  columns: ColumnMapping[];
  indexes?: string[];
  customQueries?: { [queryName: string]: string };
  // Nuevos campos para prompts específicos por tabla
  tableContext?: TableContextPrompts;
}

export interface ColumnMapping {
  // Nombre estándar que entiende el sistema
  standardName: string;
  // Nombre real en la BD externa
  actualColumnName: string;
  // Tipo de dato
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'json';
  // Es requerido?
  required: boolean;
  // Valor por defecto
  defaultValue?: any;
  // Validaciones
  validation?: FieldValidation;
  // Descripción para el agente IA
  description?: string;
}

export interface DatabaseRelationship {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  description?: string;
}

export interface PredefinedQueries {
  // Consultas de clientes
  buscarCliente: string;
  crearCliente: string;
  actualizarCliente: string;
  listarClientes: string;
  
  // Consultas de productos
  buscarProductos: string;
  obtenerProductoPorId: string;
  verificarStock: string;
  
  // Consultas de documentos
  crearEncabezadoDoc: string;
  agregarMovimientoDoc: string;
  obtenerDocumento: string;
  listarDocumentos: string;
  
  // Consultas de métodos de pago
  obtenerMetodosPago: string;
  validarMetodoPago: string;
  
  // Consultas personalizadas
  [customQuery: string]: string;
}

export interface AgentInstructions {
  // Instrucciones generales
  generalContext: string;
  
  // Instrucciones específicas por funcionalidad
  clienteManagement: {
    searchInstructions: string;
    createInstructions: string;
    updateInstructions: string;
    validationRules: string[];
  };
  
  productoManagement: {
    searchInstructions: string;
    stockValidation: string;
    priceHandling: string;
  };
  
  documentManagement: {
    documentTypes: DocumentTypeConfig[];
    workflows: WorkflowInstruction[];
  };
  
  paymentHandling: {
    supportedMethods: PaymentMethodConfig[];
    validationRules: string[];
  };
  
  // Instrucciones de formato de respuesta
  responseFormats: {
    successMessages: { [action: string]: string };
    errorMessages: { [error: string]: string };
    dataPresentation: { [dataType: string]: string };
  };
}

export interface DocumentTypeConfig {
  type: string; // 'factura', 'cotizacion', 'pedido', etc.
  prefix: string;
  numberingLogic: string;
  requiredFields: string[];
  optionalFields: string[];
  statusFlow: string[];
}

export interface WorkflowInstruction {
  action: string;
  description: string;
  steps: string[];
  validations: string[];
  nextActions: string[];
}

export interface PaymentMethodConfig {
  method: string;
  enabled: boolean;
  validationRules: string[];
  processingInstructions: string;
}

export interface BusinessRules {
  ruleName: string;
  description: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
}

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  allowedValues?: any[];
  customValidation?: string;
}

// Nueva interfaz para prompts específicos por tabla
export interface TableContextPrompts {
  // Descripción del propósito de la tabla
  purpose: string;
  // Instrucciones para consultas (SELECT)
  queryInstructions: string;
  // Instrucciones para inserción (INSERT)
  insertInstructions: string;
  // Instrucciones para actualización (UPDATE)
  updateInstructions: string;
  // Relaciones importantes con otras tablas
  relationshipGuidance: string;
  // Validaciones y reglas específicas
  businessLogic: string;
  // Ejemplos de uso común
  usageExamples: string[];
  // Campos críticos que requieren atención especial
  criticalFields: string[];
  // Consejos para el agente AI
  aiTips: string[];
} 