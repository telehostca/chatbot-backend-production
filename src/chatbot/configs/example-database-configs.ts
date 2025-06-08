import { DatabaseSchemaConfig } from '../schemas/database-schema.interface';

/**
 * Ejemplo de configuración para un sistema de facturación tradicional
 * con base de datos MySQL
 */
export const ejemploSistemaFacturacionMySQL: DatabaseSchemaConfig = {
  chatbotId: 'chatbot-empresa-abc',
  databaseType: 'mysql',
  description: 'Sistema de facturación empresarial con MySQL - Empresa ABC',

  tables: {
    clientes: {
      tableName: 'tbl_clientes',
      primaryKey: 'cli_id',
      columns: [
        {
          standardName: 'id',
          actualColumnName: 'cli_id',
          dataType: 'number',
          required: true,
          description: 'ID único del cliente'
        },
        {
          standardName: 'nombre',
          actualColumnName: 'cli_nombre_completo',
          dataType: 'string',
          required: true,
          validation: { minLength: 2, maxLength: 100 },
          description: 'Nombre completo del cliente'
        },
        {
          standardName: 'email',
          actualColumnName: 'cli_correo_electronico',
          dataType: 'string',
          required: false,
          validation: { pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
          description: 'Correo electrónico del cliente'
        },
        {
          standardName: 'telefono',
          actualColumnName: 'cli_telefono',
          dataType: 'string',
          required: false,
          validation: { pattern: '^[0-9+\\-\\s()]+$' },
          description: 'Número de teléfono'
        },
        {
          standardName: 'cedula',
          actualColumnName: 'cli_documento_identidad',
          dataType: 'string',
          required: true,
          validation: { pattern: '^[VEJPGvejpg][0-9]{7,9}$' },
          description: 'Cédula de identidad venezolana'
        },
        {
          standardName: 'activo',
          actualColumnName: 'cli_status_activo',
          dataType: 'boolean',
          required: true,
          defaultValue: true,
          description: 'Cliente activo o inactivo'
        }
      ],
      tableContext: {
        purpose: "Gestiona la información de clientes del sistema. Es la tabla central para identificar y relacionar todas las transacciones comerciales con personas específicas.",
        
        queryInstructions: "Para buscar clientes usa LIKE con '%término%' en nombre, cédula o teléfono. Siempre filtra por activo=1. Ordena por nombre. Limita a 10-20 resultados máximo para no sobrecargar la respuesta.",
        
        insertInstructions: "Antes de crear, SIEMPRE verifica que la cédula no exista. Campos obligatorios: nombre y cédula. Email y teléfono son opcionales pero recomendados. Valida formato de cédula venezolana (V/E/J/P + 7-9 dígitos).",
        
        updateInstructions: "Solo permite actualizar nombre, email y teléfono. NUNCA actualices la cédula (es inmutable). Siempre confirma cambios antes de ejecutar.",
        
        relationshipGuidance: "Esta tabla se relaciona con: documentos de venta (1:N), historial de compras, métodos de pago preferidos. Un cliente puede tener múltiples documentos pero cada documento pertenece a un solo cliente.",
        
        businessLogic: "Un cliente inactivo no puede realizar nuevas compras pero mantiene su historial. La cédula debe ser única en el sistema. Si el cliente no tiene email, usar WhatsApp como método de contacto principal.",
        
        criticalFields: ['cedula', 'nombre', 'activo'],
        
        usageExamples: [
          "Buscar cliente: 'Necesito el cliente con cédula V12345678'",
          "Crear cliente: 'Registrar nuevo cliente Juan Pérez, V12345678, juan@email.com'",
          "Verificar existencia: 'Antes de crear, buscar si ya existe esta cédula'"
        ],
        
        aiTips: [
          "Siempre confirma la cédula antes de crear un cliente nuevo",
          "Si no encuentras un cliente, ofrece crearlo inmediatamente",
          "Valida formato de email si el cliente lo proporciona",
          "Usa el nombre completo, no abreviaciones"
        ]
      }
    },

    productos: {
      tableName: 'tbl_inventario_productos',
      primaryKey: 'prod_id',
      columns: [
        {
          standardName: 'id',
          actualColumnName: 'prod_id',
          dataType: 'number',
          required: true,
          description: 'ID único del producto'
        },
        {
          standardName: 'nombre',
          actualColumnName: 'prod_descripcion',
          dataType: 'string',
          required: true,
          validation: { minLength: 3, maxLength: 200 },
          description: 'Descripción del producto'
        },
        {
          standardName: 'codigo',
          actualColumnName: 'prod_codigo_interno',
          dataType: 'string',
          required: true,
          validation: { pattern: '^[A-Z0-9\\-]{3,20}$' },
          description: 'Código interno del producto'
        },
        {
          standardName: 'precio_usd',
          actualColumnName: 'prod_precio_dolares',
          dataType: 'number',
          required: true,
          validation: { minValue: 0.01 },
          description: 'Precio en dólares estadounidenses'
        },
        {
          standardName: 'precio_bs',
          actualColumnName: 'prod_precio_bolivares',
          dataType: 'number',
          required: true,
          validation: { minValue: 0.01 },
          description: 'Precio en bolívares'
        },
        {
          standardName: 'stock',
          actualColumnName: 'prod_cantidad_disponible',
          dataType: 'number',
          required: true,
          validation: { minValue: 0 },
          description: 'Cantidad disponible en inventario'
        },
        {
          standardName: 'categoria',
          actualColumnName: 'prod_categoria',
          dataType: 'string',
          required: false,
          description: 'Categoría del producto'
        }
      ],
      tableContext: {
        purpose: "Controla el inventario de productos disponibles para la venta. Incluye precios en múltiples monedas y control de stock en tiempo real.",
        
        queryInstructions: "Busca por nombre, código o categoría usando LIKE. SIEMPRE muestra precios en ambas monedas (USD y Bs). Filtra por stock > 0 para productos disponibles. Ordena por relevancia del nombre.",
        
        insertInstructions: "Genera código automático si no se proporciona. Valida que el código no exista. Precios deben ser > 0. Stock inicial puede ser 0. Categoría es opcional pero recomendada para organización.",
        
        updateInstructions: "Permite actualizar precios, stock y descripción. El código puede cambiarse solo si no hay ventas previas. SIEMPRE verifica stock antes de reducirlo.",
        
        relationshipGuidance: "Se relaciona con: líneas de detalle de documentos (1:N), movimientos de inventario, promociones. Un producto puede estar en múltiples documentos.",
        
        businessLogic: "Stock 0 = producto agotado pero visible. Stock < 5 = alerta de stock bajo. Precios deben mantenerse sincronizados entre USD y Bs según tasa del día.",
        
        criticalFields: ['codigo', 'precio_usd', 'precio_bs', 'stock'],
        
        usageExamples: [
          "Buscar producto: 'Buscar productos que contengan paracetamol'",
          "Verificar stock: 'Cuántas unidades quedan del producto ABC-123'",
          "Crear producto: 'Registrar nuevo producto Aspirina 500mg, código ASP-500, precio $2.50'"
        ],
        
        aiTips: [
          "Siempre verifica stock antes de ofrecer un producto",
          "Muestra ambos precios (USD y Bs) al cliente",
          "Si stock es bajo, avisa al cliente inmediatamente",
          "Sugiere productos similares si el solicitado no tiene stock"
        ]
      }
    },

    encabezadoDoc: {
      tableName: 'tbl_documentos_venta',
      primaryKey: 'doc_id',
      columns: [
        {
          standardName: 'id',
          actualColumnName: 'doc_id',
          dataType: 'number',
          required: true,
          description: 'ID único del documento'
        },
        {
          standardName: 'numero',
          actualColumnName: 'doc_numero_factura',
          dataType: 'string',
          required: true,
          description: 'Número de factura'
        },
        {
          standardName: 'cliente_id',
          actualColumnName: 'doc_cliente_id',
          dataType: 'number',
          required: true,
          description: 'ID del cliente'
        },
        {
          standardName: 'fecha',
          actualColumnName: 'doc_fecha_emision',
          dataType: 'date',
          required: true,
          description: 'Fecha de emisión'
        },
        {
          standardName: 'total_usd',
          actualColumnName: 'doc_monto_total_dolares',
          dataType: 'number',
          required: true,
          validation: { minValue: 0 },
          description: 'Monto total en USD'
        },
        {
          standardName: 'total_bs',
          actualColumnName: 'doc_monto_total_bolivares',
          dataType: 'number',
          required: true,
          validation: { minValue: 0 },
          description: 'Monto total en Bs'
        },
        {
          standardName: 'status',
          actualColumnName: 'doc_estado',
          dataType: 'string',
          required: true,
          validation: { allowedValues: ['PENDIENTE', 'PAGADO', 'ANULADO'] },
          defaultValue: 'PENDIENTE',
          description: 'Estado del documento'
        }
      ],
      // NUEVO: Contexto específico para encabezado de documentos
      tableContext: {
        purpose: "Almacena la información principal de los documentos de venta (facturas, presupuestos, etc.). Es el encabezado que agrupa todas las líneas de detalle.",
        
        queryInstructions: "Para listar documentos usa filtros por fecha, cliente o estado. SIEMPRE incluye JOIN con clientes para mostrar nombre. Ordena por fecha descendente. Incluye totales en ambas monedas.",
        
        insertInstructions: "Requiere cliente_id válido, fecha actual, total calculado de las líneas. Genera número secuencial automático. Estado inicial 'PENDIENTE'. Valida que el total coincida con la suma de líneas.",
        
        updateInstructions: "Solo permite cambiar estado (PENDIENTE → PAGADO → ANULADO). Los datos financieros son inmutables una vez creados. Requiere autorización para anular.",
        
        relationshipGuidance: "Padre de movimientosDoc (1:N). Relacionado con clientes (N:1). Cada documento tiene múltiples líneas pero pertenece a un solo cliente.",
        
        businessLogic: "Un documento ANULADO no puede volver a PENDIENTE. Un documento PAGADO no puede modificarse. El total debe ser > 0. La fecha no puede ser futura.",
        
        criticalFields: ['numero', 'cliente_id', 'total_usd', 'total_bs', 'status'],
        
        usageExamples: [
          "Crear factura: 'Generar factura para cliente V12345678 con productos XYZ'",
          "Consultar documento: 'Mostrar factura número FACT-2024-001'",
          "Cambiar estado: 'Marcar factura FACT-2024-001 como PAGADA'"
        ],
        
        aiTips: [
          "Siempre valida que el cliente existe antes de crear documento",
          "Calcula totales automáticamente desde las líneas de detalle",
          "Informa cambios de estado al cliente",
          "Genera número correlativo siguiendo el patrón configurado"
        ]
      }
    },

    movimientosDoc: {
      tableName: 'tbl_detalle_documentos',
      primaryKey: 'det_id',
      columns: [
        {
          standardName: 'id',
          actualColumnName: 'det_id',
          dataType: 'number',
          required: true,
          description: 'ID único del detalle'
        },
        {
          standardName: 'documento_id',
          actualColumnName: 'det_documento_id',
          dataType: 'number',
          required: true,
          description: 'ID del documento padre'
        },
        {
          standardName: 'producto_id',
          actualColumnName: 'det_producto_id',
          dataType: 'number',
          required: true,
          description: 'ID del producto'
        },
        {
          standardName: 'cantidad',
          actualColumnName: 'det_cantidad',
          dataType: 'number',
          required: true,
          validation: { minValue: 0.01 },
          description: 'Cantidad del producto'
        },
        {
          standardName: 'precio_unitario_usd',
          actualColumnName: 'det_precio_unit_dolares',
          dataType: 'number',
          required: true,
          validation: { minValue: 0.01 },
          description: 'Precio unitario en USD'
        },
        {
          standardName: 'precio_unitario_bs',
          actualColumnName: 'det_precio_unit_bolivares',
          dataType: 'number',
          required: true,
          validation: { minValue: 0.01 },
          description: 'Precio unitario en Bs'
        },
        {
          standardName: 'subtotal_usd',
          actualColumnName: 'det_subtotal_dolares',
          dataType: 'number',
          required: true,
          validation: { minValue: 0 },
          description: 'Subtotal línea en USD'
        }
      ],
      // NUEVO: Contexto específico para movimientos de documentos
      tableContext: {
        purpose: "Almacena las líneas de detalle de cada documento de venta. Cada registro representa un producto específico dentro de una factura o presupuesto.",
        
        queryInstructions: "SIEMPRE incluye JOIN con productos para mostrar nombre y código. Agrupa por documento_id para mostrar resúmenes. Calcula subtotales automáticamente (cantidad × precio_unitario).",
        
        insertInstructions: "Requiere documento_id válido y producto_id existente. Verifica stock disponible antes de insertar. Calcula subtotal automáticamente. Usa precios actuales del producto.",
        
        updateInstructions: "Permite modificar cantidad y recalcular subtotales. Si cambias cantidad, verifica stock. Al modificar líneas, actualiza el total del documento padre.",
        
        relationshipGuidance: "Hijo de encabezadoDoc (N:1). Relacionado con productos (N:1). Cada línea pertenece a un documento y referencia un producto específico.",
        
        businessLogic: "Subtotal = cantidad × precio_unitario. Si se modifica una línea, recalcular total del documento. No permitir cantidad > stock disponible.",
        
        criticalFields: ['documento_id', 'producto_id', 'cantidad', 'precio_unitario_usd', 'subtotal_usd'],
        
        usageExamples: [
          "Agregar línea: 'Añadir 5 unidades del producto ABC-123 a la factura FACT-001'",
          "Modificar cantidad: 'Cambiar cantidad a 3 unidades en la línea 2 del documento'",
          "Consultar detalle: 'Mostrar todos los productos de la factura FACT-001'"
        ],
        
        aiTips: [
          "Siempre verifica stock antes de agregar una línea",
          "Calcula subtotales automáticamente",
          "Actualiza el total del documento cuando cambies líneas",
          "Muestra nombre del producto, no solo el ID"
        ]
      }
    },

    metodosPago: {
      tableName: 'tbl_metodos_pago',
      primaryKey: 'mp_id',
      columns: [
        {
          standardName: 'id',
          actualColumnName: 'mp_id',
          dataType: 'number',
          required: true,
          description: 'ID único del método de pago'
        },
        {
          standardName: 'nombre',
          actualColumnName: 'mp_descripcion',
          dataType: 'string',
          required: true,
          description: 'Descripción del método de pago'
        },
        {
          standardName: 'tipo',
          actualColumnName: 'mp_tipo',
          dataType: 'string',
          required: true,
          validation: { allowedValues: ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'PAGO_MOVIL', 'ZELLE'] },
          description: 'Tipo de método de pago'
        },
        {
          standardName: 'activo',
          actualColumnName: 'mp_habilitado',
          dataType: 'boolean',
          required: true,
          defaultValue: true,
          description: 'Método de pago activo'
        }
      ],
      // NUEVO: Contexto específico para métodos de pago
      tableContext: {
        purpose: "Catálogo de métodos de pago disponibles en el sistema. Define las formas en que los clientes pueden pagar sus compras.",
        
        queryInstructions: "Filtra SIEMPRE por activo=1 para mostrar solo métodos habilitados. Ordena por tipo y nombre. Incluye descripción para que el cliente comprenda las opciones.",
        
        insertInstructions: "Valida que el tipo sea válido (EFECTIVO, TRANSFERENCIA, TARJETA, PAGO_MOVIL, ZELLE). Por defecto crear como activo=1. No permitir nombres duplicados.",
        
        updateInstructions: "Permite activar/desactivar métodos según política comercial. Cambios en métodos de pago requieren notificación a clientes activos.",
        
        relationshipGuidance: "Referenciado por documentos de venta y registros de pago. Un método puede usarse en múltiples transacciones.",
        
        businessLogic: "EFECTIVO = inmediato, TRANSFERENCIA/PAGO_MOVIL = requiere validación, ZELLE = solo USD, TARJETA = requiere terminal POS.",
        
        criticalFields: ['nombre', 'tipo', 'activo'],
        
        usageExamples: [
          "Listar métodos: 'Mostrar todas las formas de pago disponibles'",
          "Validar método: 'Verificar si acepta pago móvil'",
          "Activar método: 'Habilitar pagos con Zelle'"
        ],
        
        aiTips: [
          "Solo muestra métodos activos al cliente",
          "Explica requisitos específicos de cada método",
          "Para ZELLE, especifica que solo acepta USD",
          "Para transferencias, solicita número de referencia"
        ]
      }
    }
  },

  relationships: [
    {
      type: 'one-to-many',
      fromTable: 'clientes',
      fromColumn: 'cli_id',
      toTable: 'encabezadoDoc',
      toColumn: 'doc_cliente_id',
      description: 'Un cliente puede tener múltiples documentos'
    },
    {
      type: 'one-to-many',
      fromTable: 'encabezadoDoc',
      fromColumn: 'doc_id',
      toTable: 'movimientosDoc',
      toColumn: 'det_documento_id',
      description: 'Un documento puede tener múltiples líneas de detalle'
    },
    {
      type: 'many-to-many',
      fromTable: 'movimientosDoc',
      fromColumn: 'det_producto_id',
      toTable: 'productos',
      toColumn: 'prod_id',
      description: 'Cada línea de detalle corresponde a un producto'
    }
  ],

  queries: {
    // Consultas de clientes
    buscarCliente: `
      SELECT {{clientes.id}}, {{clientes.nombre}}, {{clientes.email}}, {{clientes.telefono}}, {{clientes.cedula}}
      FROM {{clientes}}
      WHERE ({{clientes.nombre}} LIKE '%{searchTerm}%' 
             OR {{clientes.cedula}} LIKE '%{searchTerm}%' 
             OR {{clientes.telefono}} LIKE '%{searchTerm}%')
        AND {{clientes.activo}} = 1
      LIMIT 10
    `,
    crearCliente: `
      INSERT INTO {{clientes}} ({{clientes.nombre}}, {{clientes.email}}, {{clientes.telefono}}, {{clientes.cedula}}, {{clientes.activo}})
      VALUES ('{nombre}', '{email}', '{telefono}', '{cedula}', 1)
    `,
    actualizarCliente: `
      UPDATE {{clientes}}
      SET {{clientes.nombre}} = '{nombre}', {{clientes.email}} = '{email}', {{clientes.telefono}} = '{telefono}'
      WHERE {{clientes.id}} = {clienteId}
    `,
    listarClientes: `
      SELECT {{clientes.id}}, {{clientes.nombre}}, {{clientes.email}}, {{clientes.telefono}}, {{clientes.cedula}}
      FROM {{clientes}}
      WHERE {{clientes.activo}} = 1
      ORDER BY {{clientes.nombre}}
      LIMIT 50
    `,

    // Consultas de productos
    buscarProductos: `
      SELECT {{productos.id}}, {{productos.nombre}}, {{productos.codigo}}, {{productos.precio_usd}}, {{productos.precio_bs}}, {{productos.stock}}, {{productos.categoria}}
      FROM {{productos}}
      WHERE ({{productos.nombre}} LIKE '%{searchTerm}%' 
             OR {{productos.codigo}} LIKE '%{searchTerm}%'
             OR {{productos.categoria}} LIKE '%{searchTerm}%')
        AND {{productos.stock}} > 0
      ORDER BY {{productos.nombre}}
      LIMIT 20
    `,
    obtenerProductoPorId: `
      SELECT {{productos.id}}, {{productos.nombre}}, {{productos.codigo}}, {{productos.precio_usd}}, {{productos.precio_bs}}, {{productos.stock}}, {{productos.categoria}}
      FROM {{productos}}
      WHERE {{productos.id}} = {productoId}
    `,
    verificarStock: `
      SELECT {{productos.stock}}
      FROM {{productos}}
      WHERE {{productos.id}} = {productoId}
    `,

    // Consultas de documentos
    crearEncabezadoDoc: `
      INSERT INTO {{encabezadoDoc}} ({{encabezadoDoc.numero}}, {{encabezadoDoc.cliente_id}}, {{encabezadoDoc.fecha}}, {{encabezadoDoc.total_usd}}, {{encabezadoDoc.total_bs}}, {{encabezadoDoc.status}})
      VALUES ('{numero}', {clienteId}, '{fecha}', {totalUsd}, {totalBs}, 'PENDIENTE')
    `,
    agregarMovimientoDoc: `
      INSERT INTO {{movimientosDoc}} ({{movimientosDoc.documento_id}}, {{movimientosDoc.producto_id}}, {{movimientosDoc.cantidad}}, {{movimientosDoc.precio_unitario_usd}}, {{movimientosDoc.precio_unitario_bs}}, {{movimientosDoc.subtotal_usd}})
      VALUES ({documentoId}, {productoId}, {cantidad}, {precioUnitUsd}, {precioUnitBs}, {subtotalUsd})
    `,
    obtenerDocumento: `
      SELECT d.{{encabezadoDoc.id}}, d.{{encabezadoDoc.numero}}, d.{{encabezadoDoc.fecha}}, d.{{encabezadoDoc.total_usd}}, d.{{encabezadoDoc.total_bs}}, d.{{encabezadoDoc.status}},
             c.{{clientes.nombre}} as cliente_nombre, c.{{clientes.cedula}} as cliente_cedula
      FROM {{encabezadoDoc}} d
      INNER JOIN {{clientes}} c ON d.{{encabezadoDoc.cliente_id}} = c.{{clientes.id}}
      WHERE d.{{encabezadoDoc.id}} = {documentoId}
    `,
    listarDocumentos: `
      SELECT d.{{encabezadoDoc.id}}, d.{{encabezadoDoc.numero}}, d.{{encabezadoDoc.fecha}}, d.{{encabezadoDoc.total_usd}}, d.{{encabezadoDoc.status}},
             c.{{clientes.nombre}} as cliente_nombre
      FROM {{encabezadoDoc}} d
      INNER JOIN {{clientes}} c ON d.{{encabezadoDoc.cliente_id}} = c.{{clientes.id}}
      WHERE d.{{encabezadoDoc.fecha}} >= '{fechaDesde}'
      ORDER BY d.{{encabezadoDoc.fecha}} DESC
      LIMIT 50
    `,

    // Consultas de métodos de pago
    obtenerMetodosPago: `
      SELECT {{metodosPago.id}}, {{metodosPago.nombre}}, {{metodosPago.tipo}}
      FROM {{metodosPago}}
      WHERE {{metodosPago.activo}} = 1
      ORDER BY {{metodosPago.nombre}}
    `,
    validarMetodoPago: `
      SELECT COUNT(*) as existe
      FROM {{metodosPago}}
      WHERE {{metodosPago.id}} = {metodoPagoId} AND {{metodosPago.activo}} = 1
    `
  },

  agentInstructions: {
    generalContext: `
Eres un asistente de ventas especializado en el sistema de facturación de Empresa ABC.
Tienes acceso a una base de datos MySQL con información de clientes, productos y documentos de venta.
Siempre mantén un tono profesional y amigable. Cuando busques información, sé específico y presenta los datos de forma clara.
`,

    clienteManagement: {
      searchInstructions: `
Para buscar clientes, puedes usar nombre completo, cédula o teléfono.
Siempre valida que la cédula tenga formato venezolano (V, E, J, P + 7-9 dígitos).
Si no encuentras el cliente, ofrece crear uno nuevo con los datos proporcionados.
      `,
      createInstructions: `
Para crear un cliente nuevo necesitas: nombre completo, cédula (obligatorio), teléfono y email (opcionales).
Valida que la cédula no exista previamente. Formato requerido: V12345678, E87654321, etc.
Confirma los datos antes de crear el registro.
      `,
      updateInstructions: `
Permite actualizar nombre, email y teléfono. La cédula no se puede cambiar.
Siempre confirma los cambios antes de ejecutarlos.
      `,
      validationRules: [
        'La cédula debe tener formato venezolano válido',
        'El nombre debe tener al menos 2 caracteres',
        'El email debe tener formato válido si se proporciona',
        'El teléfono debe contener solo números, espacios, guiones y paréntesis'
      ]
    },

    productoManagement: {
      searchInstructions: `
Busca productos por nombre, código interno o categoría.
Muestra siempre: nombre, código, precios en USD y Bs, stock disponible.
Si el stock es bajo (menos de 5 unidades), avisa al cliente.
      `,
      stockValidation: `
Antes de agregar productos a un documento, verifica que hay stock suficiente.
Si no hay stock suficiente, informa la cantidad disponible y sugiere alternativas.
      `,
      priceHandling: `
Siempre muestra ambos precios (USD y Bs).
Los precios están actualizados en la base de datos, úsalos tal como están.
      `
    },

    documentManagement: {
      documentTypes: [
        {
          type: 'factura',
          prefix: 'FACT-',
          numberingLogic: 'Secuencial por año: FACT-2024-001',
          requiredFields: ['cliente_id', 'fecha', 'lineas_detalle'],
          optionalFields: ['observaciones'],
          statusFlow: ['PENDIENTE', 'PAGADO', 'ANULADO']
        },
        {
          type: 'cotizacion',
          prefix: 'COT-',
          numberingLogic: 'Secuencial por año: COT-2024-001',
          requiredFields: ['cliente_id', 'fecha', 'lineas_detalle', 'vigencia'],
          optionalFields: ['condiciones', 'observaciones'],
          statusFlow: ['VIGENTE', 'VENCIDO', 'CONVERTIDO', 'ANULADO']
        }
      ],
      workflows: [
        {
          action: 'crear_factura',
          description: 'Crear una nueva factura de venta',
          steps: [
            '1. Verificar o crear cliente',
            '2. Agregar productos y verificar stock',
            '3. Calcular totales en USD y Bs',
            '4. Generar número de factura',
            '5. Crear encabezado del documento',
            '6. Agregar líneas de detalle',
            '7. Confirmar creación'
          ],
          validations: [
            'Cliente debe existir y estar activo',
            'Todos los productos deben tener stock suficiente',
            'Los totales deben ser mayores a cero',
            'Debe haber al menos una línea de detalle'
          ],
          nextActions: ['generar_pdf', 'enviar_por_email', 'registrar_pago']
        }
      ]
    },

    paymentHandling: {
      supportedMethods: [
        {
          method: 'EFECTIVO',
          enabled: true,
          validationRules: ['Monto debe ser positivo'],
          processingInstructions: 'Registrar pago en efectivo directamente'
        },
        {
          method: 'TRANSFERENCIA',
          enabled: true,
          validationRules: ['Requiere número de referencia', 'Banco emisor'],
          processingInstructions: 'Solicitar comprobante de transferencia'
        },
        {
          method: 'PAGO_MOVIL',
          enabled: true,
          validationRules: ['Requiere número de referencia', 'Teléfono origen'],
          processingInstructions: 'Verificar referencia de pago móvil'
        },
        {
          method: 'ZELLE',
          enabled: true,
          validationRules: ['Solo en USD', 'Email confirmado'],
          processingInstructions: 'Confirmar recepción en cuenta Zelle'
        }
      ],
      validationRules: [
        'El método de pago debe estar activo',
        'El monto debe coincidir con el total del documento',
        'Se requiere referencia para pagos electrónicos'
      ]
    },

    responseFormats: {
      successMessages: {
        'cliente_creado': '✅ Cliente creado exitosamente con ID: {id}',
        'producto_encontrado': '🛍️ Producto encontrado: {nombre} - Stock: {stock} - Precio: ${precio_usd} / Bs {precio_bs}',
        'factura_creada': '📄 Factura {numero} creada exitosamente por un total de ${total_usd} / Bs {total_bs}',
        'pago_registrado': '💰 Pago registrado exitosamente. Documento actualizado a estado PAGADO'
      },
      errorMessages: {
        'cliente_no_encontrado': '❌ No se encontró cliente con esos datos. ¿Deseas crear uno nuevo?',
        'producto_sin_stock': '⚠️ Producto sin stock suficiente. Disponible: {stock} unidades',
        'datos_invalidos': '❌ Los datos proporcionados no son válidos: {errores}',
        'error_bd': '🚨 Error de base de datos. Por favor, intenta nuevamente'
      },
      dataPresentation: {
        'lista_clientes': 'ID: {id} | {nombre} | {cedula} | {telefono}',
        'lista_productos': '{codigo} | {nombre} | ${precio_usd} / Bs {precio_bs} | Stock: {stock}',
        'resumen_documento': 'Doc: {numero} | Cliente: {cliente_nombre} | Total: ${total_usd} | Estado: {status}'
      }
    }
  },

  businessRules: [
    {
      ruleName: 'stock_minimo',
      description: 'Alerta cuando el stock es menor a 5 unidades',
      condition: 'producto.stock < 5',
      action: 'mostrar_alerta_stock_bajo',
      priority: 1,
      enabled: true
    },
    {
      ruleName: 'cliente_inactivo',
      description: 'No permitir ventas a clientes inactivos',
      condition: 'cliente.activo = false',
      action: 'bloquear_venta',
      priority: 2,
      enabled: true
    },
    {
      ruleName: 'documento_minimo',
      description: 'Monto mínimo de documento',
      condition: 'documento.total_usd < 1',
      action: 'rechazar_documento',
      priority: 3,
      enabled: true
    }
  ]
};

/**
 * Ejemplo para un sistema con PostgreSQL y estructura diferente
 */
export const ejemploSistemaInventarioPostgreSQL: DatabaseSchemaConfig = {
  chatbotId: 'chatbot-tienda-xyz',
  databaseType: 'postgres',
  description: 'Sistema de inventario y ventas con PostgreSQL - Tienda XYZ',

  tables: {
    clientes: {
      tableName: 'customers',
      primaryKey: 'customer_id',
      columns: [
        {
          standardName: 'id',
          actualColumnName: 'customer_id',
          dataType: 'number',
          required: true,
          description: 'ID único del cliente'
        },
        {
          standardName: 'nombre',
          actualColumnName: 'full_name',
          dataType: 'string',
          required: true,
          validation: { minLength: 2, maxLength: 150 },
          description: 'Nombre completo del cliente'
        },
        {
          standardName: 'email',
          actualColumnName: 'email_address',
          dataType: 'string',
          required: true,
          validation: { pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
          description: 'Correo electrónico'
        },
        {
          standardName: 'telefono',
          actualColumnName: 'phone_number',
          dataType: 'string',
          required: false,
          validation: { pattern: '^[0-9+\\-\\s()]+$' },
          description: 'Número de teléfono'
        },
        {
          standardName: 'cedula',
          actualColumnName: 'document_number',
          dataType: 'string',
          required: true,
          validation: { minLength: 7, maxLength: 15 },
          description: 'Número de documento de identidad'
        },
        {
          standardName: 'activo',
          actualColumnName: 'is_active',
          dataType: 'boolean',
          required: true,
          defaultValue: true,
          description: 'Cliente activo'
        }
      ]
    },

    productos: {
      tableName: 'inventory_items',
      primaryKey: 'item_id',
      columns: [
        {
          standardName: 'id',
          actualColumnName: 'item_id',
          dataType: 'number',
          required: true,
          description: 'ID único del producto'
        },
        {
          standardName: 'nombre',
          actualColumnName: 'item_name',
          dataType: 'string',
          required: true,
          validation: { minLength: 3, maxLength: 255 },
          description: 'Nombre del producto'
        },
        {
          standardName: 'codigo',
          actualColumnName: 'sku',
          dataType: 'string',
          required: true,
          validation: { pattern: '^[A-Z0-9\\-]{3,30}$' },
          description: 'SKU del producto'
        },
        {
          standardName: 'precio_usd',
          actualColumnName: 'price_usd',
          dataType: 'number',
          required: true,
          validation: { minValue: 0.01 },
          description: 'Precio en USD'
        },
        {
          standardName: 'precio_bs',
          actualColumnName: 'price_bs',
          dataType: 'number',
          required: true,
          validation: { minValue: 0.01 },
          description: 'Precio en Bs'
        },
        {
          standardName: 'stock',
          actualColumnName: 'quantity_available',
          dataType: 'number',
          required: true,
          validation: { minValue: 0 },
          description: 'Cantidad disponible'
        },
        {
          standardName: 'categoria',
          actualColumnName: 'category_name',
          dataType: 'string',
          required: false,
          description: 'Categoría del producto'
        }
      ]
    },

    encabezadoDoc: {
      tableName: 'sales_orders',
      primaryKey: 'order_id',
      columns: [
        {
          standardName: 'id',
          actualColumnName: 'order_id',
          dataType: 'number',
          required: true,
          description: 'ID de la orden'
        },
        {
          standardName: 'numero',
          actualColumnName: 'order_number',
          dataType: 'string',
          required: true,
          description: 'Número de orden'
        },
        {
          standardName: 'cliente_id',
          actualColumnName: 'customer_id',
          dataType: 'number',
          required: true,
          description: 'ID del cliente'
        },
        {
          standardName: 'fecha',
          actualColumnName: 'created_at',
          dataType: 'date',
          required: true,
          description: 'Fecha de creación'
        },
        {
          standardName: 'total_usd',
          actualColumnName: 'total_amount_usd',
          dataType: 'number',
          required: true,
          validation: { minValue: 0 },
          description: 'Total en USD'
        },
        {
          standardName: 'total_bs',
          actualColumnName: 'total_amount_bs',
          dataType: 'number',
          required: true,
          validation: { minValue: 0 },
          description: 'Total en Bs'
        },
        {
          standardName: 'status',
          actualColumnName: 'order_status',
          dataType: 'string',
          required: true,
          validation: { allowedValues: ['pending', 'paid', 'cancelled'] },
          defaultValue: 'pending',
          description: 'Estado de la orden'
        }
      ]
    },

    movimientosDoc: {
      tableName: 'order_line_items',
      primaryKey: 'line_id',
      columns: [
        {
          standardName: 'id',
          actualColumnName: 'line_id',
          dataType: 'number',
          required: true,
          description: 'ID de la línea'
        },
        {
          standardName: 'documento_id',
          actualColumnName: 'order_id',
          dataType: 'number',
          required: true,
          description: 'ID de la orden'
        },
        {
          standardName: 'producto_id',
          actualColumnName: 'item_id',
          dataType: 'number',
          required: true,
          description: 'ID del producto'
        },
        {
          standardName: 'cantidad',
          actualColumnName: 'quantity',
          dataType: 'number',
          required: true,
          validation: { minValue: 0.01 },
          description: 'Cantidad'
        },
        {
          standardName: 'precio_unitario_usd',
          actualColumnName: 'unit_price_usd',
          dataType: 'number',
          required: true,
          validation: { minValue: 0.01 },
          description: 'Precio unitario USD'
        },
        {
          standardName: 'precio_unitario_bs',
          actualColumnName: 'unit_price_bs',
          dataType: 'number',
          required: true,
          validation: { minValue: 0.01 },
          description: 'Precio unitario Bs'
        },
        {
          standardName: 'subtotal_usd',
          actualColumnName: 'line_total_usd',
          dataType: 'number',
          required: true,
          validation: { minValue: 0 },
          description: 'Subtotal USD'
        }
      ]
    },

    metodosPago: {
      tableName: 'payment_methods',
      primaryKey: 'method_id',
      columns: [
        {
          standardName: 'id',
          actualColumnName: 'method_id',
          dataType: 'number',
          required: true,
          description: 'ID del método de pago'
        },
        {
          standardName: 'nombre',
          actualColumnName: 'method_name',
          dataType: 'string',
          required: true,
          description: 'Nombre del método'
        },
        {
          standardName: 'tipo',
          actualColumnName: 'method_type',
          dataType: 'string',
          required: true,
          validation: { allowedValues: ['cash', 'transfer', 'card', 'mobile_payment', 'zelle'] },
          description: 'Tipo de método'
        },
        {
          standardName: 'activo',
          actualColumnName: 'is_enabled',
          dataType: 'boolean',
          required: true,
          defaultValue: true,
          description: 'Método habilitado'
        }
      ]
    }
  },

  relationships: [
    {
      type: 'one-to-many',
      fromTable: 'clientes',
      fromColumn: 'customer_id',
      toTable: 'encabezadoDoc',
      toColumn: 'customer_id',
      description: 'Cliente puede tener múltiples órdenes'
    }
  ],

  queries: {
    buscarCliente: `
      SELECT {{clientes.id}}, {{clientes.nombre}}, {{clientes.email}}, {{clientes.telefono}}, {{clientes.cedula}}
      FROM {{clientes}}
      WHERE ({{clientes.nombre}} ILIKE '%{searchTerm}%' 
             OR {{clientes.cedula}} ILIKE '%{searchTerm}%' 
             OR {{clientes.telefono}} ILIKE '%{searchTerm}%')
        AND {{clientes.activo}} = true
      LIMIT 10
    `,
    crearCliente: `
      INSERT INTO {{clientes}} ({{clientes.nombre}}, {{clientes.email}}, {{clientes.telefono}}, {{clientes.cedula}}, {{clientes.activo}})
      VALUES ($1, $2, $3, $4, true)
      RETURNING {{clientes.id}}
    `,
    actualizarCliente: '',
    listarClientes: '',
    buscarProductos: `
      SELECT {{productos.id}}, {{productos.nombre}}, {{productos.codigo}}, {{productos.precio_usd}}, {{productos.precio_bs}}, {{productos.stock}}, {{productos.categoria}}
      FROM {{productos}}
      WHERE ({{productos.nombre}} ILIKE '%{searchTerm}%' 
             OR {{productos.codigo}} ILIKE '%{searchTerm}%'
             OR {{productos.categoria}} ILIKE '%{searchTerm}%')
        AND {{productos.stock}} > 0
      ORDER BY {{productos.nombre}}
      LIMIT 20
    `,
    obtenerProductoPorId: '',
    verificarStock: '',
    crearEncabezadoDoc: '',
    agregarMovimientoDoc: '',
    obtenerDocumento: '',
    listarDocumentos: '',
    obtenerMetodosPago: '',
    validarMetodoPago: ''
  },

  agentInstructions: {
    generalContext: `
Eres un asistente para Tienda XYZ. Maneja un sistema PostgreSQL con estructura en inglés.
Mantén siempre comunicación en español pero ten en cuenta que los nombres de columnas están en inglés.
    `,
    clienteManagement: {
      searchInstructions: 'Busca clientes por nombre, documento o teléfono usando ILIKE para búsquedas insensibles a mayúsculas.',
      createInstructions: 'Usa parámetros preparados ($1, $2, etc.) para PostgreSQL.',
      updateInstructions: 'Siempre usa transacciones para actualizaciones.',
      validationRules: ['Email es obligatorio en este sistema', 'Usar RETURNING clause para obtener IDs generados']
    },
    productoManagement: {
      searchInstructions: 'Busca productos usando ILIKE. Muestra SKU como código.',
      stockValidation: 'Stock mínimo: 1 unidad. Alertar si stock < 10.',
      priceHandling: 'Precios siempre en ambas monedas. Usar 2 decimales.'
    },
    documentManagement: {
      documentTypes: [
        {
          type: 'orden',
          prefix: 'ORD-',
          numberingLogic: 'Secuencial: ORD-001, ORD-002...',
          requiredFields: ['customer_id', 'line_items'],
          optionalFields: ['notes'],
          statusFlow: ['pending', 'paid', 'cancelled']
        }
      ],
      workflows: []
    },
    paymentHandling: {
      supportedMethods: [
        {
          method: 'cash',
          enabled: true,
          validationRules: ['Monto positivo'],
          processingInstructions: 'Efectivo directo'
        }
      ],
      validationRules: ['Validar método habilitado']
    },
    responseFormats: {
      successMessages: {
        'cliente_creado': '✅ Cliente creado con ID: {id}',
        'orden_creada': '📦 Orden {numero} creada por ${total_usd}'
      },
      errorMessages: {
        'cliente_no_encontrado': '❌ Cliente no encontrado',
        'error_bd': '🚨 Error PostgreSQL'
      },
      dataPresentation: {
        'lista_clientes': '{id} | {nombre} | {email}',
        'lista_productos': '{codigo} | {nombre} | ${precio_usd}'
      }
    }
  },

  businessRules: [
    {
      ruleName: 'stock_critico',
      description: 'Stock crítico en PostgreSQL',
      condition: 'quantity_available < 10',
      action: 'alerta_stock_critico',
      priority: 1,
      enabled: true
    }
  ]
}; 