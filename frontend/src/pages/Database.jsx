import React, { useState, useEffect } from 'react'
import { useNotification } from '../components/NotificationProvider'
import { useLoading } from '../components/LoadingProvider'
import { api } from '../services/api'

const Database = () => {
  const [configs, setConfigs] = useState([])
  const [chatbots, setChatbots] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [autoDetecting, setAutoDetecting] = useState(false)
  const [generatingContext, setGeneratingContext] = useState(false)
  const [detectedSchema, setDetectedSchema] = useState(null)
  const { showNotification } = useNotification()
  const { setLoading } = useLoading()

  // Estado del formulario
  const [formData, setFormData] = useState({
    chatbotId: '',
    databaseType: 'mysql',
    description: '',
    connection: {
      host: '',
      port: 3306,
      database: '',
      username: '',
      password: ''
    },
    tables: {
      clientes: {
        tableName: '',
        primaryKey: 'id',
        columns: []
      },
      productos: {
        tableName: '',
        primaryKey: 'id',
        columns: []
      },
      encabezadoDoc: {
        tableName: '',
        primaryKey: 'id',
        columns: []
      },
      movimientosDoc: {
        tableName: '',
        primaryKey: 'id',
        columns: []
      },
      metodosPago: {
        tableName: '',
        primaryKey: 'id',
        columns: []
      }
    }
  })

  useEffect(() => {
    loadConfigs()
    loadChatbots()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      console.log('📋 Cargando configuraciones...')
      const response = await api.getDatabaseConfigs()
      console.log('📥 Respuesta de configuraciones:', response)
      setConfigs(response.data || [])
      console.log('💾 Configuraciones cargadas:', response.data?.length || 0)
    } catch (error) {
      console.error('❌ Error cargando configuraciones:', error)
      showNotification('error', 'Error', 'No se pudieron cargar las configuraciones')
    } finally {
      setLoading(false)
    }
  }

  const loadChatbots = async () => {
    try {
      const response = await api.getChatbots()
      setChatbots(response.data || [])
    } catch (error) {
      console.error('Error loading chatbots:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      // Construir configuración completa para el backend
      const configData = {
        chatbotId: formData.chatbotId,
        databaseType: formData.databaseType,
        description: formData.description,
        tables: formData.tables,
        relationships: [],
        queries: {
          buscarCliente: `SELECT * FROM ${formData.tables.clientes.tableName} WHERE id = ?`,
          crearCliente: `INSERT INTO ${formData.tables.clientes.tableName} (nombre, email) VALUES (?, ?)`,
          actualizarCliente: `UPDATE ${formData.tables.clientes.tableName} SET nombre = ?, email = ? WHERE id = ?`,
          listarClientes: `SELECT * FROM ${formData.tables.clientes.tableName} LIMIT 100`,
          buscarProductos: `SELECT * FROM ${formData.tables.productos.tableName} WHERE nombre LIKE ?`,
          obtenerProductoPorId: `SELECT * FROM ${formData.tables.productos.tableName} WHERE id = ?`,
          verificarStock: `SELECT stock FROM ${formData.tables.productos.tableName} WHERE id = ?`,
          crearEncabezadoDoc: `INSERT INTO ${formData.tables.encabezadoDoc.tableName} (cliente_id, fecha, total) VALUES (?, ?, ?)`,
          agregarMovimientoDoc: `INSERT INTO ${formData.tables.movimientosDoc.tableName} (documento_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)`,
          obtenerDocumento: `SELECT * FROM ${formData.tables.encabezadoDoc.tableName} WHERE id = ?`,
          listarDocumentos: `SELECT * FROM ${formData.tables.encabezadoDoc.tableName} ORDER BY fecha DESC LIMIT 100`,
          obtenerMetodosPago: `SELECT * FROM ${formData.tables.metodosPago.tableName} WHERE activo = 1`,
          validarMetodoPago: `SELECT * FROM ${formData.tables.metodosPago.tableName} WHERE id = ? AND activo = 1`
        },
        agentInstructions: {
          generalContext: `Sistema de ${formData.description} usando ${formData.databaseType}`,
          clienteManagement: {
            searchInstructions: "Buscar clientes por ID, nombre o email",
            createInstructions: "Crear nuevos clientes con validación de datos",
            updateInstructions: "Actualizar información de clientes existentes",
            validationRules: ["Email debe ser válido", "Nombre es requerido"]
          },
          productoManagement: {
            searchInstructions: "Buscar productos por nombre o ID",
            stockValidation: "Verificar disponibilidad antes de vender",
            priceHandling: "Usar precios actualizados del sistema"
          },
          documentManagement: {
            documentTypes: [{
              type: "factura",
              prefix: "FAC",
              numberingLogic: "Incremental",
              requiredFields: ["cliente_id", "fecha", "total"],
              optionalFields: ["observaciones"],
              statusFlow: ["borrador", "confirmado", "pagado"]
            }],
            workflows: [{
              action: "crear_factura",
              description: "Crear nueva factura",
              steps: ["Validar cliente", "Agregar productos", "Calcular total", "Guardar"],
              validations: ["Cliente existe", "Productos disponibles", "Total > 0"],
              nextActions: ["procesar_pago", "enviar_email"]
            }]
          },
          paymentHandling: {
            supportedMethods: [{
              method: "efectivo",
              enabled: true,
              validationRules: ["Monto exacto"],
              processingInstructions: "Registrar pago inmediato"
            }],
            validationRules: ["Verificar método activo", "Validar monto"]
          },
          responseFormats: {
            successMessages: {
              create: "Registro creado exitosamente",
              update: "Registro actualizado correctamente",
              delete: "Registro eliminado"
            },
            errorMessages: {
              not_found: "Registro no encontrado",
              validation_error: "Datos inválidos",
              connection_error: "Error de conexión"
            },
            dataPresentation: {
              client: "Mostrar nombre, email y teléfono",
              product: "Mostrar nombre, precio y stock",
              document: "Mostrar número, fecha y total"
            }
          }
        },
        businessRules: [
          {
            ruleName: "stock_validation",
            description: "Validar stock antes de venta",
            condition: "stock > cantidad_solicitada",
            action: "permitir_venta",
            priority: 1,
            enabled: true
          },
          {
            ruleName: "client_validation",
            description: "Validar datos de cliente",
            condition: "email_valido AND nombre_no_vacio",
            action: "crear_cliente",
            priority: 2,
            enabled: true
          }
        ]
      }

      console.log('💾 Guardando configuración:', {
        isEditing: !!editingConfig,
        chatbotId: editingConfig?.chatbotId || configData.chatbotId,
        configData: configData
      })

      if (editingConfig) {
        console.log('✏️ Actualizando configuración existente...')
        const response = await api.updateDatabaseConfig(editingConfig.chatbotId, configData)
        console.log('📤 Respuesta de actualización:', response)
        showNotification('success', 'Éxito', 'Configuración actualizada correctamente')
      } else {
        console.log('➕ Creando nueva configuración...')
        const response = await api.createDatabaseConfig(configData)
        console.log('📤 Respuesta de creación:', response)
        showNotification('success', 'Éxito', 'Configuración creada correctamente')
      }

      setShowModal(false)
      resetForm()
      loadConfigs()
    } catch (error) {
      console.error('❌ Error guardando configuración:', error)
      showNotification('error', 'Error', error.response?.data?.message || error.message || 'Error desconocido guardando configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true)
      const connectionData = {
        databaseType: formData.databaseType,
        host: formData.connection.host,
        port: formData.connection.port,
        database: formData.connection.database,
        username: formData.connection.username,
        password: formData.connection.password
      }

      await api.testDatabaseConnection(connectionData)
      showNotification('success', 'Conexión exitosa', 'La base de datos se conectó correctamente')
    } catch (error) {
      showNotification('error', 'Error de conexión', error.message)
    } finally {
      setTestingConnection(false)
    }
  }

  const handleAutoDetectSchema = async () => {
    try {
      setAutoDetecting(true)
      const connectionData = {
        databaseType: formData.databaseType,
        host: formData.connection.host,
        port: formData.connection.port,
        database: formData.connection.database,
        username: formData.connection.username,
        password: formData.connection.password
      }

      console.log('🔍 Enviando datos de conexión:', connectionData)
      const response = await api.detectDatabaseSchema(connectionData)
      console.log('📊 Respuesta de auto-detección:', response)
      
      // El método request ya devuelve directamente la data decodificada
      const data = response
      
      if (data && data.success) {
        setDetectedSchema(data.schema)
        
        // Auto-llenar las tablas detectadas
        if (data.suggestedConfig && data.suggestedConfig.tables) {
          console.log('🗂️ Tablas detectadas del backend:', Object.keys(data.suggestedConfig.tables));
          console.log('📊 Total de tablas a asignar:', Object.keys(data.suggestedConfig.tables).length);
          console.log('📋 Detalle de tablas:', data.suggestedConfig.tables);
          
          const newFormData = {
            ...formData,
            tables: data.suggestedConfig.tables,
            description: data.suggestedConfig.description || formData.description
          };
          
          console.log('✅ Nuevo formData.tables tendrá:', Object.keys(newFormData.tables).length, 'tablas');
          console.log('🔧 Claves de las tablas:', Object.keys(newFormData.tables));
          
          setFormData(newFormData);
          
          // Verificación adicional después de setState
          setTimeout(() => {
            console.log('⏰ Verificación post-setState - formData.tables actual:', Object.keys(formData.tables).length);
          }, 100);
        }

        showNotification('success', 'Detección exitosa', 
          `${data.message}. Las tablas han sido configuradas automáticamente.`)
      } else {
        throw new Error(data?.message || 'Error en la detección de esquema')
      }
    } catch (error) {
      console.error('❌ Error en auto-detección:', error)
      showNotification('error', 'Error de detección', 
        error.response?.data?.message || error.message || 'Error desconocido en la detección')
    } finally {
      setAutoDetecting(false)
    }
  }

  const handleGenerateAIContext = async (e) => {
    // Prevenir envío del formulario
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    console.log('🧠 handleGenerateAIContext llamado')
    console.log('📊 Tablas actuales:', formData.tables)
    
    try {
      setGeneratingContext(true)
      
      // Preparar datos de las tablas para el análisis de IA
      const tablesForAnalysis = Object.entries(formData.tables).map(([mappedName, table]) => ({
        name: table.tableName,
        mappedName: mappedName,
        columns: table.columns || [],
        primaryKey: table.primaryKey,
        purpose: table.purpose,
        totalColumns: table.totalColumns
      }))

      console.log('🧠 Generando contexto IA para', tablesForAnalysis.length, 'tablas')
      const response = await api.generateAIContext(tablesForAnalysis)
      console.log('🤖 Respuesta de generación IA:', response)
      
      if (response && response.success) {
        // Aplicar el contexto generado a las tablas existentes
        const updatedTables = { ...formData.tables }
        
        Object.entries(response.enhancedTables).forEach(([tableName, enhancedTable]) => {
          if (updatedTables[tableName]) {
            updatedTables[tableName] = {
              ...updatedTables[tableName],
              tableContext: enhancedTable.tableContext
            }
          }
        })
        
        setFormData({
          ...formData,
          tables: updatedTables
        })
        
        showNotification('success', 'Contexto IA generado', 
          `${response.message}. Los campos de contexto han sido rellenados automáticamente.`)
      } else {
        throw new Error(response?.message || 'Error generando contexto de IA')
      }
    } catch (error) {
      console.error('❌ Error generando contexto IA:', error)
      showNotification('error', 'Error de IA', 
        error.response?.data?.message || error.message || 'Error desconocido generando contexto')
    } finally {
      setGeneratingContext(false)
    }
  }

  const handleRegenerateContext = async (tableKey, table, e) => {
    // Prevenir envío del formulario
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    try {
      setGeneratingContext(true)
      
      // Preparar datos de una sola tabla para regeneración
      const singleTableData = [{
        name: table.tableName,
        mappedName: tableKey,
        columns: table.columns || [],
        primaryKey: table.primaryKey,
        purpose: table.purpose,
        totalColumns: table.totalColumns
      }]

      console.log('🔄 Regenerando contexto IA para tabla:', table.tableName)
      const response = await api.generateAIContext(singleTableData)
      
      if (response && response.success) {
        // Aplicar el contexto regenerado solo a esta tabla
        const updatedTables = { ...formData.tables }
        
        if (response.enhancedTables[tableKey]) {
          updatedTables[tableKey] = {
            ...updatedTables[tableKey],
            tableContext: response.enhancedTables[tableKey].tableContext
          }
        }
        
        setFormData({
          ...formData,
          tables: updatedTables
        })
        
        showNotification('success', 'Contexto regenerado', 
          `Contexto IA actualizado para la tabla ${tableKey}`)
      } else {
        throw new Error(response?.message || 'Error regenerando contexto de IA')
      }
    } catch (error) {
      console.error('❌ Error regenerando contexto IA:', error)
      showNotification('error', 'Error de regeneración', 
        error.response?.data?.message || error.message || 'Error desconocido regenerando contexto')
    } finally {
      setGeneratingContext(false)
    }
  }

  const handleDelete = async (chatbotId) => {
    if (!confirm('¿Estás seguro de eliminar esta configuración?')) return
    
    try {
      setLoading(true)
      console.log('🗑️ Eliminando configuración:', chatbotId)
      const response = await api.deleteDatabaseConfig(chatbotId)
      console.log('✅ Respuesta de eliminación:', response)
      showNotification('success', 'Éxito', 'Configuración eliminada correctamente')
      await loadConfigs() // Aguardar recarga
    } catch (error) {
      console.error('❌ Error eliminando configuración:', error)
      showNotification('error', 'Error', error.response?.data?.message || error.message || 'Error desconocido eliminando configuración')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      chatbotId: '',
      databaseType: 'mysql',
      description: '',
      connection: {
        host: '',
        port: 3306,
        database: '',
        username: '',
        password: ''
      },
      tables: {
        clientes: { tableName: '', primaryKey: 'id', columns: [] },
        productos: { tableName: '', primaryKey: 'id', columns: [] },
        encabezadoDoc: { tableName: '', primaryKey: 'id', columns: [] },
        movimientosDoc: { tableName: '', primaryKey: 'id', columns: [] },
        metodosPago: { tableName: '', primaryKey: 'id', columns: [] }
      }
    })
    setEditingConfig(null)
  }

  const handleEdit = async (config) => {
    try {
      setLoading(true)
      console.log('✏️ Editando configuración:', config.chatbotId)
      const response = await api.getDatabaseConfig(config.chatbotId)
      console.log('📁 Respuesta completa recibida:', response)
      
      // Acceder correctamente a los datos desde response.data
      const fullConfig = response.data
      console.log('📋 Configuración extraída:', fullConfig)

      if (fullConfig) {
        console.log('📋 Tablas en la configuración:', fullConfig.tables)
        console.log('📊 Total de tablas a cargar:', Object.keys(fullConfig.tables || {}).length)
        
        setFormData({
          chatbotId: fullConfig.chatbotId,
          databaseType: fullConfig.databaseType,
          description: fullConfig.description || '',
          connection: {
            host: fullConfig.connection?.host || '',
            port: fullConfig.connection?.port || (fullConfig.databaseType === 'mysql' ? 3306 : 5432),
            database: fullConfig.connection?.database || '',
            username: fullConfig.connection?.username || '',
            password: '' // No cargar la contraseña por seguridad
          },
          // Preservar exactamente las tablas que estaban guardadas
          tables: fullConfig.tables || {}
        })
        setEditingConfig(config)
        console.log('💾 FormData actualizado con', Object.keys(fullConfig.tables || {}).length, 'tablas')
      } else {
        console.warn('⚠️ No se encontró configuración para:', config.chatbotId)
        showNotification('warning', 'Advertencia', 'No se encontró la configuración completa')
      }
      setShowModal(true)
    } catch (error) {
      console.error('❌ Error cargando configuración para editar:', error)
      showNotification('error', 'Error', 'No se pudo cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">🗄️ Base de Datos Externa</h1>
        <p className="text-gray-600 mt-2">Configuración de conexiones a bases de datos externas para chatbots</p>
      </div>

      {/* Header Actions */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-4">
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <i className="fas fa-plus mr-2"></i>
            Nueva Configuración
          </button>
        </div>
        <div className="text-sm text-gray-500">
          {configs.length} configuraciones activas
        </div>
      </div>

      {/* Configurations List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Configuraciones de Base de Datos</h2>
        </div>
        
        {configs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">🗄️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay configuraciones</h3>
            <p className="text-gray-500 mb-4">Crea tu primera configuración de base de datos externa</p>
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Crear Configuración
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {configs.map((config) => (
              <div key={config.chatbotId} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {config.databaseType === 'mysql' ? 'MY' : 
                           config.databaseType === 'postgres' ? 'PG' : 
                           config.databaseType === 'mssql' ? 'MS' : 'DB'}
                        </span>
                      </div>
                      <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {config.chatbotId}
                      </h3>
                        <p className="text-sm text-gray-600">{config.description}</p>
                      </div>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                        config.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {config.isActive ? '✅ Activo' : '❌ Inactivo'}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <strong>Tipo:</strong> {config.databaseType.toUpperCase()}
                      </div>
                      <div>
                        <strong>Tablas:</strong> {config.tablesCount} configuradas
                      </div>
                      <div>
                        <strong>Consultas:</strong> {config.queriesCount} predefinidas
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(config)}
                      className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md hover:bg-blue-50"
                      title="Editar"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(config.chatbotId)}
                      className="text-red-600 hover:text-red-800 px-3 py-1 rounded-md hover:bg-red-50"
                      title="Eliminar"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Configuración */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <form onSubmit={handleSubmit}>
              {/* Header del Modal */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingConfig ? '✏️ Editar Configuración' : '➕ Nueva Configuración'} de Base de Datos
            </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Contenido del Modal */}
              <div className="px-6 py-4 space-y-6">
                
                {/* Información Básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chatbot *</label>
                    <select
                      value={formData.chatbotId}
                      onChange={(e) => setFormData({...formData, chatbotId: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar chatbot...</option>
                      {chatbots.map((chatbot) => (
                        <option key={chatbot.id} value={chatbot.id}>
                          {chatbot.name} ({chatbot.organization?.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de BD *</label>
                    <select
                      value={formData.databaseType}
                      onChange={(e) => setFormData({
                        ...formData, 
                        databaseType: e.target.value,
                        connection: {
                          ...formData.connection,
                          port: e.target.value === 'mysql' ? 3306 : 5432
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mysql">MySQL</option>
                      <option value="postgres">PostgreSQL</option>
                      <option value="mssql">SQL Server</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Sistema de facturación, inventario, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Configuración de Conexión */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">🔗 Configuración de Conexión</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Host *</label>
                      <input
                        type="text"
                        value={formData.connection.host}
                        onChange={(e) => setFormData({
                          ...formData, 
                          connection: {...formData.connection, host: e.target.value}
                        })}
                        placeholder="localhost o IP del servidor"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Puerto *</label>
                      <input
                        type="number"
                        value={formData.connection.port}
                        onChange={(e) => setFormData({
                          ...formData, 
                          connection: {...formData.connection, port: parseInt(e.target.value)}
                        })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Base de Datos *</label>
                      <input
                        type="text"
                        value={formData.connection.database}
                        onChange={(e) => setFormData({
                          ...formData, 
                          connection: {...formData.connection, database: e.target.value}
                        })}
                        placeholder="nombre_base_datos"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                      <input
                        type="text"
                        value={formData.connection.username}
                        onChange={(e) => setFormData({
                          ...formData, 
                          connection: {...formData.connection, username: e.target.value}
                        })}
                        placeholder="usuario_bd"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                      <input
                        type="password"
                        value={formData.connection.password}
                        onChange={(e) => setFormData({
                          ...formData, 
                          connection: {...formData.connection, password: e.target.value}
                        })}
                        placeholder="contraseña_bd"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testingConnection || !formData.connection.host || !formData.connection.database}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testingConnection ? '⏳ Probando...' : '🧪 Probar Conexión'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleAutoDetectSchema}
                        disabled={autoDetecting || !formData.connection.host || !formData.connection.database}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {autoDetecting ? '🔍 Detectando...' : '🤖 Auto-Detectar Tablas'}
                      </button>
                      
                      {Object.keys(formData.tables).length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleGenerateAIContext()}
                          disabled={generatingContext}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingContext ? '🧠 Generando...' : '🧠 Generar Contexto IA'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Configuración de Tablas */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-semibold text-gray-800">📋 Mapeo de Tablas</h4>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {Object.keys(formData.tables).length} tablas configuradas
                    </span>
                  </div>
                  {console.log('🖼️ RENDERIZANDO TABLAS:', Object.keys(formData.tables), 'Total:', Object.keys(formData.tables).length)}
                  <div className="space-y-4">
                    {Object.entries(formData.tables).map(([key, table]) => (
                      <div key={key} className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Información básica de la tabla */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              🗂️ Tabla de {key.charAt(0).toUpperCase() + key.slice(1)}
                            </label>
                            <input
                              type="text"
                              value={table.tableName}
                              onChange={(e) => setFormData({
                                ...formData,
                                tables: {
                                  ...formData.tables,
                                  [key]: {...table, tableName: e.target.value}
                                }
                              })}
                              placeholder={`nombre_tabla_${key}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* Clave primaria */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              🔑 Clave Primaria
                            </label>
                            <input
                              type="text"
                              value={table.primaryKey}
                              onChange={(e) => setFormData({
                                ...formData,
                                tables: {
                                  ...formData.tables,
                                  [key]: {...table, primaryKey: e.target.value}
                                }
                              })}
                              placeholder="id"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Prompts específicos por tabla */}
                        <div className="mt-4 border-t pt-3">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="text-sm font-medium text-gray-700">🤖 Contexto de IA para esta tabla</h5>
                            <div className="flex items-center gap-2">
                              {table.tableContext?.confidence && (
                                <span className={`px-2 py-1 rounded text-xs ${
                                  table.tableContext.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                                  table.tableContext.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {Math.round(table.tableContext.confidence * 100)}% confianza IA
                                </span>
                              )}
                              {table.tableName && (
                                <button
                                  type="button"
                                  onClick={(e) => handleRegenerateContext(key, table, e)}
                                  disabled={generatingContext}
                                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                  title="Regenerar contexto IA para esta tabla"
                                >
                                  🔄
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {/* Propósito */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                📋 Propósito (¿Qué almacena esta tabla?)
                              </label>
                              <textarea
                                value={table.tableContext?.purpose || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  tables: {
                                    ...formData.tables,
                                    [key]: {
                                      ...table, 
                                      tableContext: {
                                        ...table.tableContext,
                                        purpose: e.target.value,
                                        queryInstructions: table.tableContext?.queryInstructions || '',
                                        insertInstructions: table.tableContext?.insertInstructions || '',
                                        updateInstructions: table.tableContext?.updateInstructions || '',
                                        relationshipGuidance: table.tableContext?.relationshipGuidance || '',
                                        businessLogic: table.tableContext?.businessLogic || '',
                                        criticalFields: table.tableContext?.criticalFields || [],
                                        usageExamples: table.tableContext?.usageExamples || [],
                                        aiTips: table.tableContext?.aiTips || []
                                      }
                                    }
                                  }
                                })}
                                placeholder={`Describe el propósito de la tabla ${key}...`}
                                rows="2"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Instrucciones de consulta */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  🔍 Cómo consultar
                                </label>
                                <textarea
                                  value={table.tableContext?.queryInstructions || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    tables: {
                                      ...formData.tables,
                                      [key]: {
                                        ...table, 
                                        tableContext: {
                                          ...table.tableContext,
                                          purpose: table.tableContext?.purpose || '',
                                          queryInstructions: e.target.value,
                                          insertInstructions: table.tableContext?.insertInstructions || '',
                                          updateInstructions: table.tableContext?.updateInstructions || '',
                                          relationshipGuidance: table.tableContext?.relationshipGuidance || '',
                                          businessLogic: table.tableContext?.businessLogic || '',
                                          criticalFields: table.tableContext?.criticalFields || [],
                                          usageExamples: table.tableContext?.usageExamples || [],
                                          aiTips: table.tableContext?.aiTips || []
                                        }
                                      }
                                    }
                                  })}
                                  placeholder="Instrucciones para consultar esta tabla..."
                                  rows="2"
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>

                              {/* Instrucciones de inserción */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  ➕ Cómo insertar
                                </label>
                                <textarea
                                  value={table.tableContext?.insertInstructions || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    tables: {
                                      ...formData.tables,
                                      [key]: {
                                        ...table, 
                                        tableContext: {
                                          ...table.tableContext,
                                          purpose: table.tableContext?.purpose || '',
                                          queryInstructions: table.tableContext?.queryInstructions || '',
                                          insertInstructions: e.target.value,
                                          updateInstructions: table.tableContext?.updateInstructions || '',
                                          relationshipGuidance: table.tableContext?.relationshipGuidance || '',
                                          businessLogic: table.tableContext?.businessLogic || '',
                                          criticalFields: table.tableContext?.criticalFields || [],
                                          usageExamples: table.tableContext?.usageExamples || [],
                                          aiTips: table.tableContext?.aiTips || []
                                        }
                                      }
                                    }
                                  })}
                                  placeholder="Instrucciones para insertar en esta tabla..."
                                  rows="2"
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            {/* Lógica de negocio */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                ⚡ Lógica de negocio y validaciones
                              </label>
                              <textarea
                                value={table.tableContext?.businessLogic || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  tables: {
                                    ...formData.tables,
                                    [key]: {
                                      ...table, 
                                      tableContext: {
                                        ...table.tableContext,
                                        purpose: table.tableContext?.purpose || '',
                                        queryInstructions: table.tableContext?.queryInstructions || '',
                                        insertInstructions: table.tableContext?.insertInstructions || '',
                                        updateInstructions: table.tableContext?.updateInstructions || '',
                                        relationshipGuidance: table.tableContext?.relationshipGuidance || '',
                                        businessLogic: e.target.value,
                                        criticalFields: table.tableContext?.criticalFields || [],
                                        usageExamples: table.tableContext?.usageExamples || [],
                                        aiTips: table.tableContext?.aiTips || []
                                      }
                                    }
                                  }
                                })}
                                placeholder="Reglas específicas, validaciones, restricciones..."
                                rows="2"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            {/* Consejos para la IA */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                🤖 Consejos específicos para el agente IA
                              </label>
                              <input
                                type="text"
                                value={
                                  Array.isArray(table.tableContext?.aiTips) 
                                    ? table.tableContext.aiTips.join(', ') 
                                    : (table.tableContext?.aiTips || '')
                                }
                                onChange={(e) => setFormData({
                                  ...formData,
                                  tables: {
                                    ...formData.tables,
                                    [key]: {
                                      ...table, 
                                      tableContext: {
                                        ...table.tableContext,
                                        purpose: table.tableContext?.purpose || '',
                                        queryInstructions: table.tableContext?.queryInstructions || '',
                                        insertInstructions: table.tableContext?.insertInstructions || '',
                                        updateInstructions: table.tableContext?.updateInstructions || '',
                                        relationshipGuidance: table.tableContext?.relationshipGuidance || '',
                                        businessLogic: table.tableContext?.businessLogic || '',
                                        criticalFields: table.tableContext?.criticalFields || [],
                                        usageExamples: table.tableContext?.usageExamples || [],
                                        aiTips: e.target.value.split(',').map(tip => tip.trim()).filter(tip => tip)
                                      }
                                    }
                                  }
                                })}
                                placeholder="Tip 1, Tip 2, Tip 3..."
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-400 mt-1">Separa múltiples consejos con comas</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    💡 Define tanto los nombres de las tablas como el contexto específico que ayudará al agente IA a entender mejor cómo trabajar con cada tabla.
                  </p>
                </div>

              </div>

              {/* Footer del Modal */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                  type="button"
                onClick={() => setShowModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
                <button
                  type="submit"
                  disabled={!formData.chatbotId || !formData.connection.host || !formData.connection.database}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingConfig ? '💾 Actualizar' : '✅ Crear'} Configuración
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Database 