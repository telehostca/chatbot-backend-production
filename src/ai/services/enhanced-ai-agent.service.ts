import { Injectable, Logger } from '@nestjs/common';
import { DatabaseMapperService } from '../../chatbot/services/database-mapper.service';
import { DatabaseSchemaConfig } from '../../chatbot/schemas/database-schema.interface';

interface AIAgentContext {
  chatbotId: string;
  conversationId: string;
  userMessage: string;
  sessionData?: any;
}

interface AIAgentResponse {
  message: string;
  actions?: ActionToExecute[];
  metadata?: {
    sqlQueries?: string[];
    validations?: string[];
    businessRules?: string[];
  };
}

interface ActionToExecute {
  type: 'database_query' | 'validation' | 'calculation' | 'notification';
  operation: string;
  parameters: any;
  description: string;
}

@Injectable()
export class EnhancedAIAgentService {
  private readonly logger = new Logger(EnhancedAIAgentService.name);

  constructor(
    private readonly databaseMapper: DatabaseMapperService
  ) {}

  /**
   * Procesa un mensaje del usuario con contexto de base de datos específica
   */
  async processMessageWithDatabaseContext(context: AIAgentContext): Promise<AIAgentResponse> {
    try {
      // 1. Obtener configuración de BD para este chatbot
      const dbSchema = this.databaseMapper.getDatabaseSchema(context.chatbotId);
      if (!dbSchema) {
        return {
          message: "⚠️ No hay configuración de base de datos externa disponible para este chatbot.",
          actions: []
        };
      }

      // 2. Detectar intención del usuario
      const intention = await this.detectUserIntention(context.userMessage);
      
      // 3. Generar contexto específico para la IA
      const aiContext = this.buildAIContext(dbSchema, intention, context);
      
      // 4. Obtener instrucciones específicas para la acción
      const actionInstructions = this.databaseMapper.getActionInstructions(
        context.chatbotId, 
        intention.action, 
        intention.context
      );

      // 5. Preparar consultas SQL si es necesario
      const sqlQueries = await this.prepareSQLQueries(context.chatbotId, intention);

      // 6. Validar datos si es una operación de escritura
      const validationResults = await this.validateOperation(context.chatbotId, intention);

      // 7. Generar respuesta contextualizada
      const response = await this.generateContextualResponse({
        dbSchema,
        intention,
        actionInstructions,
        sqlQueries,
        validationResults,
        userMessage: context.userMessage
      });

      return response;

    } catch (error) {
      this.logger.error(`Error procesando mensaje con contexto de BD: ${error.message}`);
      return {
        message: "🚨 Ocurrió un error procesando tu solicitud. Por favor, intenta nuevamente.",
        actions: []
      };
    }
  }

  /**
   * Detecta la intención del usuario en el mensaje
   */
  private async detectUserIntention(userMessage: string): Promise<{ action: string; entity: string; context: any }> {
    const message = userMessage.toLowerCase();
    
    // Palabras clave para clientes
    if (message.includes('buscar cliente') || message.includes('encontrar cliente') || 
        message.includes('cliente con') || message.includes('busca el cliente')) {
      return { 
        action: 'buscar_cliente', 
        entity: 'cliente',
        context: { searchTerm: this.extractSearchTerm(userMessage) }
      };
    }

    if (message.includes('crear cliente') || message.includes('nuevo cliente') ||
        message.includes('registrar cliente') || message.includes('agregar cliente')) {
      return {
        action: 'crear_cliente',
        entity: 'cliente',
        context: this.extractClientData(userMessage)
      };
    }

    // Palabras clave para productos
    if (message.includes('buscar producto') || message.includes('productos con') ||
        message.includes('busca producto') || message.includes('mostrar producto')) {
      return {
        action: 'buscar_productos',
        entity: 'producto',
        context: { searchTerm: this.extractSearchTerm(userMessage) }
      };
    }

    if (message.includes('stock de') || message.includes('inventario de') ||
        message.includes('disponibilidad de') || message.includes('cuánto stock')) {
      return {
        action: 'verificar_stock',
        entity: 'producto',
        context: { productId: this.extractProductIdentifier(userMessage) }
      };
    }

    // Palabras clave para documentos
    if (message.includes('crear factura') || message.includes('nueva factura') ||
        message.includes('facturar') || message.includes('hacer factura')) {
      return {
        action: 'crear_documento',
        entity: 'factura',
        context: { 
          documentType: 'factura',
          clienteInfo: this.extractClientData(userMessage),
          productos: this.extractProductList(userMessage)
        }
      };
    }

    if (message.includes('crear cotización') || message.includes('nueva cotización') ||
        message.includes('cotizar') || message.includes('presupuesto')) {
      return {
        action: 'crear_documento',
        entity: 'cotizacion',
        context: { 
          documentType: 'cotizacion',
          clienteInfo: this.extractClientData(userMessage),
          productos: this.extractProductList(userMessage)
        }
      };
    }

    // Palabras clave para pagos
    if (message.includes('registrar pago') || message.includes('pago de') ||
        message.includes('cancelar factura') || message.includes('marcar como pagado')) {
      return {
        action: 'registrar_pago',
        entity: 'pago',
        context: {
          documentId: this.extractDocumentId(userMessage),
          paymentMethod: this.extractPaymentMethod(userMessage),
          amount: this.extractAmount(userMessage)
        }
      };
    }

    // Intención general o consulta
    return {
      action: 'consulta_general',
      entity: 'general',
      context: { query: userMessage }
    };
  }

  /**
   * Construye el contexto completo para la IA
   */
  private buildAIContext(dbSchema: DatabaseSchemaConfig, intention: any, context: AIAgentContext): string {
    const contextParts = [];

    // Contexto general del agente
    contextParts.push("=== CONTEXTO DEL AGENTE IA ===");
    contextParts.push(this.databaseMapper.generateAgentContext(context.chatbotId));
    contextParts.push("");

    // Intención detectada
    contextParts.push("=== INTENCIÓN DETECTADA ===");
    contextParts.push(`Acción: ${intention.action}`);
    contextParts.push(`Entidad: ${intention.entity}`);
    contextParts.push(`Contexto: ${JSON.stringify(intention.context, null, 2)}`);
    contextParts.push("");

    // Reglas de negocio aplicables
    const applicableRules = dbSchema.businessRules.filter(rule => 
      rule.enabled && 
      (rule.ruleName.includes(intention.entity) || intention.action.includes(rule.ruleName))
    );

    if (applicableRules.length > 0) {
      contextParts.push("=== REGLAS DE NEGOCIO APLICABLES ===");
      for (const rule of applicableRules) {
        contextParts.push(`- ${rule.description}`);
        contextParts.push(`  Condición: ${rule.condition}`);
        contextParts.push(`  Acción: ${rule.action}`);
      }
      contextParts.push("");
    }

    return contextParts.join('\n');
  }

  /**
   * Prepara consultas SQL para la operación
   */
  private async prepareSQLQueries(chatbotId: string, intention: any): Promise<string[]> {
    const queries: string[] = [];

    try {
      switch (intention.action) {
        case 'buscar_cliente':
          if (intention.context.searchTerm) {
            const query = this.databaseMapper.getAdaptedQuery(
              chatbotId, 
              'buscarCliente', 
              { searchTerm: intention.context.searchTerm }
            );
            queries.push(query);
          }
          break;

        case 'crear_cliente':
          if (intention.context.nombre && intention.context.cedula) {
            const query = this.databaseMapper.getAdaptedQuery(
              chatbotId,
              'crearCliente',
              intention.context
            );
            queries.push(query);
          }
          break;

        case 'buscar_productos':
          if (intention.context.searchTerm) {
            const query = this.databaseMapper.getAdaptedQuery(
              chatbotId,
              'buscarProductos',
              { searchTerm: intention.context.searchTerm }
            );
            queries.push(query);
          }
          break;

        case 'verificar_stock':
          if (intention.context.productId) {
            const query = this.databaseMapper.getAdaptedQuery(
              chatbotId,
              'verificarStock',
              { productoId: intention.context.productId }
            );
            queries.push(query);
          }
          break;

        case 'crear_documento':
          // Múltiples consultas para crear documento completo
          if (intention.context.clienteInfo && intention.context.productos) {
            const encabezadoQuery = this.databaseMapper.getAdaptedQuery(
              chatbotId,
              'crearEncabezadoDoc',
              {
                numero: this.generateDocumentNumber(intention.context.documentType),
                clienteId: intention.context.clienteInfo.id,
                fecha: new Date().toISOString().split('T')[0],
                totalUsd: intention.context.totalUsd || 0,
                totalBs: intention.context.totalBs || 0
              }
            );
            queries.push(encabezadoQuery);

            // Consultas para cada línea de detalle
            for (const producto of intention.context.productos) {
              const detalleQuery = this.databaseMapper.getAdaptedQuery(
                chatbotId,
                'agregarMovimientoDoc',
                {
                  documentoId: '{documentoId}', // Se reemplazará después de crear el encabezado
                  productoId: producto.id,
                  cantidad: producto.cantidad,
                  precioUnitUsd: producto.precioUnitUsd,
                  precioUnitBs: producto.precioUnitBs,
                  subtotalUsd: producto.cantidad * producto.precioUnitUsd
                }
              );
              queries.push(detalleQuery);
            }
          }
          break;
      }
    } catch (error) {
      this.logger.error(`Error preparando consultas SQL: ${error.message}`);
    }

    return queries;
  }

  /**
   * Valida operaciones antes de ejecutarlas
   */
  private async validateOperation(chatbotId: string, intention: any): Promise<{ isValid: boolean; errors: string[] }> {
    const validationResults = { isValid: true, errors: [] };

    try {
      switch (intention.action) {
        case 'crear_cliente':
          const clienteValidation = this.databaseMapper.validateData(
            chatbotId,
            'clientes',
            intention.context
          );
          validationResults.isValid = clienteValidation.isValid;
          validationResults.errors.push(...clienteValidation.errors);
          break;

        case 'crear_documento':
          // Validar datos del documento
          if (intention.context.productos && intention.context.productos.length === 0) {
            validationResults.isValid = false;
            validationResults.errors.push('Debe agregar al menos un producto al documento');
          }

          // Validar cada producto
          for (const producto of intention.context.productos || []) {
            if (!producto.cantidad || producto.cantidad <= 0) {
              validationResults.isValid = false;
              validationResults.errors.push(`Cantidad inválida para producto ${producto.nombre}`);
            }
          }
          break;
      }
    } catch (error) {
      this.logger.error(`Error en validación: ${error.message}`);
      validationResults.isValid = false;
      validationResults.errors.push('Error interno de validación');
    }

    return validationResults;
  }

  /**
   * Genera respuesta contextualizada
   */
  private async generateContextualResponse(params: {
    dbSchema: DatabaseSchemaConfig;
    intention: any;
    actionInstructions: string;
    sqlQueries: string[];
    validationResults: { isValid: boolean; errors: string[] };
    userMessage: string;
  }): Promise<AIAgentResponse> {

    const { dbSchema, intention, actionInstructions, sqlQueries, validationResults } = params;
    const actions: ActionToExecute[] = [];

    // Si hay errores de validación, retornar errores
    if (!validationResults.isValid) {
      const errorMessage = dbSchema.agentInstructions.responseFormats.errorMessages['datos_invalidos'] || 
                          'Los datos proporcionados no son válidos';
      
      return {
        message: errorMessage.replace('{errores}', validationResults.errors.join(', ')),
        actions: []
      };
    }

    // Generar acciones a ejecutar
    if (sqlQueries.length > 0) {
      for (const query of sqlQueries) {
        actions.push({
          type: 'database_query',
          operation: intention.action,
          parameters: { sql: query, context: intention.context },
          description: `Ejecutar consulta para ${intention.action}`
        });
      }
    }

    // Generar mensaje de respuesta
    let responseMessage = "";

    switch (intention.action) {
      case 'buscar_cliente':
        responseMessage = "🔍 Buscando cliente con los datos proporcionados...";
        break;
      
      case 'crear_cliente':
        responseMessage = "✅ Validación exitosa. Procediendo a crear el cliente...";
        break;
      
      case 'buscar_productos':
        responseMessage = "🛍️ Buscando productos que coincidan con tu búsqueda...";
        break;
      
      case 'crear_documento':
        const docType = intention.context.documentType || 'documento';
        responseMessage = `📄 Preparando ${docType}. Verificando datos y stock...`;
        break;
      
      case 'consulta_general':
        responseMessage = `${actionInstructions}\n\n¿En qué puedo ayudarte específicamente?`;
        break;
      
      default:
        responseMessage = "🤖 Procesando tu solicitud...";
    }

    return {
      message: responseMessage,
      actions,
      metadata: {
        sqlQueries,
        validations: validationResults.errors,
        businessRules: dbSchema.businessRules
          .filter(rule => rule.enabled)
          .map(rule => rule.description)
      }
    };
  }

  // Métodos de extracción de datos del mensaje

  private extractSearchTerm(message: string): string {
    // Buscar patrones comunes de búsqueda
    const patterns = [
      /buscar.*?(?:cliente|producto).*?["']([^"']+)["']/i,
      /buscar.*?(?:cliente|producto).*?con.*?["']([^"']+)["']/i,
      /(?:cliente|producto).*?["']([^"']+)["']/i,
      /buscar.*?["']([^"']+)["']/i,
      /buscar.*?(\w+.*?)$/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return message.replace(/buscar|cliente|producto|con/gi, '').trim();
  }

  private extractClientData(message: string): any {
    const clientData: any = {};

    // Extraer nombre
    const nameMatch = message.match(/nombre[:\s]+["']?([^"'\n,]+)["']?/i);
    if (nameMatch) clientData.nombre = nameMatch[1].trim();

    // Extraer cédula
    const cedulaMatch = message.match(/(?:cédula|cedula|ci)[:\s]+["']?([VEJPGvejpg]?[0-9]{7,9})["']?/i);
    if (cedulaMatch) clientData.cedula = cedulaMatch[1].trim();

    // Extraer teléfono
    const phoneMatch = message.match(/(?:teléfono|telefono|tlf)[:\s]+["']?([0-9+\-\s()]+)["']?/i);
    if (phoneMatch) clientData.telefono = phoneMatch[1].trim();

    // Extraer email
    const emailMatch = message.match(/(?:email|correo)[:\s]+["']?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})["']?/i);
    if (emailMatch) clientData.email = emailMatch[1].trim();

    return clientData;
  }

  private extractProductList(message: string): any[] {
    // Implementar extracción de lista de productos
    return [];
  }

  private extractProductIdentifier(message: string): string {
    // Extraer ID o código de producto
    const idMatch = message.match(/(?:producto|id)[:\s]+["']?([A-Za-z0-9\-]+)["']?/i);
    return idMatch ? idMatch[1].trim() : '';
  }

  private extractDocumentId(message: string): string {
    const docMatch = message.match(/(?:factura|documento|doc)[:\s]+["']?([A-Za-z0-9\-]+)["']?/i);
    return docMatch ? docMatch[1].trim() : '';
  }

  private extractPaymentMethod(message: string): string {
    const methods = ['efectivo', 'transferencia', 'tarjeta', 'pago móvil', 'zelle'];
    for (const method of methods) {
      if (message.toLowerCase().includes(method)) {
        return method.toUpperCase().replace(' ', '_');
      }
    }
    return 'EFECTIVO';
  }

  private extractAmount(message: string): number {
    const amountMatch = message.match(/(?:\$|usd|bs)?\s?([0-9,\.]+)/i);
    return amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
  }

  private generateDocumentNumber(documentType: string): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    switch (documentType) {
      case 'factura':
        return `FACT-${year}-${random}`;
      case 'cotizacion':
        return `COT-${year}-${random}`;
      default:
        return `DOC-${year}-${random}`;
    }
  }
} 