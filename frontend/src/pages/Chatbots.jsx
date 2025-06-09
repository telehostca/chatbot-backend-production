import React, { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'
import { generateWebhookUrl, needsWebhookUpdate, getWebhookBaseUrl } from '../config/webhook'

// Definición de modelos por proveedor
const AI_MODELS = {
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-coder', label: 'DeepSeek Coder' },
    { value: 'deepseek-v2', label: 'DeepSeek V2' },
    { value: 'deepseek-llm', label: 'DeepSeek LLM' },
    { value: 'deepseek-chat-v2', label: 'DeepSeek Chat v2' },
  ],
  openai: [
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4o', label: 'GPT-4o' },
  ],
  anthropic: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  ],
  google: [
    { value: 'gemini-pro', label: 'Gemini Pro' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
};

// 🤖 TIPOS DE CHATBOT DISPONIBLES
const CHATBOT_TYPES = {
  basico: {
    name: 'Chatbot Básico',
    icon: '💬',
    description: 'Asistente general para atención al cliente',
    features: {
      supportsEcommerce: false,
      supportsAppointments: false,
      supportsPayments: false,
      supportsInventory: false,
      maxCartItems: 0
    },
    prompts: {
      system: 'Eres un asistente virtual amigable y útil. Ayudas a los usuarios con sus consultas de manera profesional y cordial.',
      userContext: 'Los usuarios buscan información general y asistencia básica.',
      instructions: '- Responde de manera clara y concisa\\n- Mantén un tono amigable\\n- Si no sabes algo, solicita más información',
      knowledge: 'Información general de la empresa y servicios básicos.'
    }
  },
  ecommerce: {
    name: 'E-commerce',
    icon: '🛒',
    description: 'Especializado en ventas, carrito y pagos',
    features: {
      supportsEcommerce: true,
      supportsAppointments: false,
      supportsPayments: true,
      supportsInventory: true,
      maxCartItems: 50,
      enableShoppingCart: true,
      enablePaymentProcessing: true
    },
    prompts: {
      system: 'Eres un asistente especializado en ventas online. Ayudas a los clientes a encontrar productos, gestionar su carrito de compras y procesar pagos.',
      userContext: 'Los usuarios son clientes potenciales interesados en comprar productos. Buscan información de productos, precios, disponibilidad y quieren realizar compras.',
      instructions: '- Ayuda a encontrar productos\\n- Gestiona el carrito de compras\\n- Procesa pedidos y pagos\\n- Verifica stock antes de confirmar\\n- Mantén el foco en la venta',
      knowledge: 'Catálogo completo de productos, precios, promociones, métodos de pago y políticas de envío.'
    }
  },
  citas: {
    name: 'Gestión de Citas',
    icon: '📅',
    description: 'Reserva y gestión de citas y horarios',
    features: {
      supportsEcommerce: false,
      supportsAppointments: true,
      supportsPayments: false,
      supportsInventory: false,
      maxCartItems: 0,
      enableAppointmentBooking: true,
      enableCalendarIntegration: true
    },
    prompts: {
      system: 'Eres un asistente especializado en gestión de citas. Ayudas a los usuarios a reservar, modificar y gestionar sus citas de manera eficiente.',
      userContext: 'Los usuarios necesitan agendar citas, consultar disponibilidad, modificar reservas existentes o cancelar citas.',
      instructions: '- Consulta disponibilidad en tiempo real\\n- Agenda citas confirmando datos\\n- Permite modificaciones y cancelaciones\\n- Envía recordatorios\\n- Valida horarios disponibles',
      knowledge: 'Horarios disponibles, servicios ofrecidos, duración de citas, políticas de cancelación y contacto.'
    }
  },
  consultoria: {
    name: 'Consultoría',
    icon: '🎯',
    description: 'Asesoramiento profesional y consultas especializadas',
    features: {
      supportsEcommerce: false,
      supportsAppointments: true,
      supportsPayments: false,
      supportsInventory: false,
      maxCartItems: 0,
      enableConsultationBooking: true,
      enableDocumentSharing: true
    },
    prompts: {
      system: 'Eres un asistente de consultoría profesional. Proporcionas información especializada, agendas consultas y diriges a los usuarios hacia los servicios apropiados.',
      userContext: 'Los usuarios buscan asesoramiento profesional, quieren entender servicios de consultoría, agendar sesiones o solicitar información especializada.',
      instructions: '- Identifica necesidades específicas\\n- Recomienda servicios apropiados\\n- Agenda consultas iniciales\\n- Proporciona información preliminar\\n- Deriva a especialistas cuando sea necesario',
      knowledge: 'Servicios de consultoría disponibles, especialidades, metodologías, casos de éxito y proceso de trabajo.'
    }
  },
  restaurante: {
    name: 'Restaurante',
    icon: '🍽️',
    description: 'Reservas, menú y pedidos de comida',
    features: {
      supportsEcommerce: true,
      supportsAppointments: true,
      supportsPayments: true,
      supportsInventory: true,
      maxCartItems: 20,
      enableFoodOrdering: true,
      enableTableReservation: true
    },
    prompts: {
      system: 'Eres un asistente de restaurante. Ayudas con el menú, tomas pedidos, gestionas reservas de mesa y proporcionas información sobre el restaurante.',
      userContext: 'Los usuarios quieren ver el menú, hacer pedidos para delivery/pickup, reservar mesas, o consultar sobre horarios y ubicación.',
      instructions: '- Presenta el menú de manera atractiva\\n- Toma pedidos verificando disponibilidad\\n- Gestiona reservas de mesa\\n- Informa horarios y ubicación\\n- Sugiere platos populares',
      knowledge: 'Menú completo con precios, ingredientes, opciones vegetarianas/veganas, horarios, ubicación, políticas de reserva.'
    }
  },
  salud: {
    name: 'Salud y Bienestar',
    icon: '🏥',
    description: 'Consultas médicas, citas y seguimiento',
    features: {
      supportsEcommerce: false,
      supportsAppointments: true,
      supportsPayments: false,
      supportsInventory: false,
      maxCartItems: 0,
      enableMedicalBooking: true,
      enableHealthTracking: true
    },
    prompts: {
      system: 'Eres un asistente de salud. Ayudas a agendar citas médicas, proporcionas información general de salud y guías a los usuarios en procesos médicos.',
      userContext: 'Los usuarios buscan agendar citas médicas, consultar sobre servicios de salud, o necesitan orientación sobre procedimientos médicos.',
      instructions: '- Agenda citas médicas verificando disponibilidad\\n- Proporciona información general (no diagnósticos)\\n- Explica procedimientos y preparación\\n- Deriva a profesionales apropiados\\n- Mantén confidencialidad',
      knowledge: 'Servicios médicos disponibles, horarios de consulta, especialidades médicas, procedimientos, políticas de citas.'
    }
  }
};

// 🎯 COMPONENTE: GESTIÓN DE INTENCIONES SaaS
const IntentManager = ({ chatbotType, intents = [], onChange }) => {
  const [activeIntent, setActiveIntent] = React.useState(null);
  const [showAddIntent, setShowAddIntent] = React.useState(false);

  // Intenciones predeterminadas según el tipo de chatbot
  const getDefaultIntents = (type) => {
    const defaultIntents = {
      'basico': [
        { name: 'saludo', keywords: ['hola', 'buenos dias', 'buenas', 'hey'], response: '¡Hola! ¿En qué puedo ayudarte?', examples: ['hola', 'buenos días', 'hey'] },
        { name: 'despedida', keywords: ['adios', 'chao', 'gracias', 'hasta luego'], response: '¡Hasta luego! Que tengas un excelente día.', examples: ['adiós', 'chao', 'hasta luego'] }
      ],
      'informativo': [
        { name: 'horarios', keywords: ['horario', 'hora', 'abierto', 'cerrado'], response: 'Nuestros horarios de atención son...', examples: ['¿qué horarios tienen?', '¿a qué hora abren?', '¿están abiertos?'] },
        { name: 'ubicacion', keywords: ['ubicacion', 'direccion', 'donde', 'llegar'], response: 'Nos ubicamos en...', examples: ['¿dónde quedan?', '¿cuál es su dirección?', '¿cómo llego?'] },
        { name: 'contacto', keywords: ['telefono', 'contacto', 'llamar', 'whatsapp'], response: 'Puedes contactarnos en...', examples: ['¿cuál es su teléfono?', '¿cómo los contacto?'] },
        { name: 'servicios', keywords: ['servicio', 'ofrecer', 'hacer', 'que'], response: 'Ofrecemos los siguientes servicios...', examples: ['¿qué servicios ofrecen?', '¿qué hacen?'] }
      ],
      'ecommerce': [
        { name: 'productos', keywords: ['producto', 'catalogo', 'venta', 'comprar'], response: 'Te ayudo a encontrar productos. ¿Qué buscas?', examples: ['¿qué productos tienen?', 'quiero comprar algo', 'muestrame el catálogo'] },
        { name: 'precios', keywords: ['precio', 'costo', 'cuanto', 'valor'], response: 'Te ayudo con información de precios...', examples: ['¿cuánto cuesta?', '¿qué precios manejan?'] },
        { name: 'pedidos', keywords: ['pedido', 'orden', 'compra', 'solicitar'], response: 'Te ayudo a procesar tu pedido...', examples: ['quiero hacer un pedido', 'cómo hago una orden'] }
      ],
      'servicio_cliente': [
        { name: 'problema', keywords: ['problema', 'error', 'falla', 'no funciona'], response: 'Lamento escuchar sobre tu problema. ¿Puedes describir qué está pasando?', examples: ['tengo un problema', 'no me funciona', 'hay un error'] },
        { name: 'reclamo', keywords: ['reclamo', 'queja', 'insatisfecho', 'malo'], response: 'Entiendo tu molestia. Vamos a resolver esto juntos.', examples: ['tengo una queja', 'quiero hacer un reclamo'] }
      ]
    };
    return defaultIntents[type] || defaultIntents['basico'];
  };

  // Inicializar con intenciones por defecto si no hay ninguna
  React.useEffect(() => {
    if (intents.length === 0 && chatbotType) {
      const defaultIntents = getDefaultIntents(chatbotType);
      onChange(defaultIntents);
    }
  }, [chatbotType]);

  const addIntent = () => {
    const newIntent = {
      id: Date.now(),
      name: '',
      keywords: [],
      response: '',
      examples: [],
      enabled: true
    };
    setActiveIntent(newIntent);
    setShowAddIntent(true);
  };

  const saveIntent = (intent) => {
    if (intent.id) {
      // Editar existente
      onChange(intents.map(i => i.id === intent.id ? intent : i));
    } else {
      // Agregar nuevo
      onChange([...intents, { ...intent, id: Date.now() }]);
    }
    setActiveIntent(null);
    setShowAddIntent(false);
  };

  const deleteIntent = (intentId) => {
    if (confirm('¿Eliminar esta intención?')) {
      onChange(intents.filter(i => i.id !== intentId));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h5 className="font-semibold text-purple-800">Intenciones Configuradas</h5>
          <p className="text-sm text-gray-600">Define cómo tu chatbot entiende y responde a diferentes tipos de consultas</p>
        </div>
        <button
          type="button"
          onClick={addIntent}
          className="bg-purple-500 text-white px-3 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm"
        >
          ➕ Nueva Intención
        </button>
      </div>

      {/* Lista de Intenciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {intents.map(intent => (
          <div key={intent.id} className="bg-white p-4 rounded-lg border border-purple-200 hover:border-purple-400 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🎯</span>
                <h6 className="font-medium text-gray-800 capitalize">{intent.name || 'Sin nombre'}</h6>
                <span className={`text-xs px-2 py-1 rounded ${intent.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {intent.enabled ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="flex space-x-1">
                <button 
                  type="button"
                  onClick={() => { setActiveIntent(intent); setShowAddIntent(true); }}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  ✏️
                </button>
                <button 
                  type="button"
                  onClick={() => deleteIntent(intent.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Keywords:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {intent.keywords?.slice(0, 3).map((kw, i) => (
                    <span key={i} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">{kw}</span>
                  ))}
                  {intent.keywords?.length > 3 && <span className="text-gray-400 text-xs">+{intent.keywords.length - 3}</span>}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Respuesta:</span>
                <p className="text-gray-700 text-xs mt-1 line-clamp-2">{intent.response || 'No configurada'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para Editar/Crear Intención */}
      {showAddIntent && (
        <IntentEditor
          intent={activeIntent}
          onSave={saveIntent}
          onCancel={() => { setShowAddIntent(false); setActiveIntent(null); }}
        />
      )}
    </div>
  );
};

// 🔧 COMPONENTE: EDITOR DE INTENCIONES
const IntentEditor = ({ intent, onSave, onCancel }) => {
  const [form, setForm] = React.useState(intent || {
    name: '',
    keywords: [],
    response: '',
    examples: [],
    enabled: true
  });
  const [newKeyword, setNewKeyword] = React.useState('');
  const [newExample, setNewExample] = React.useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setForm({ ...form, keywords: [...(form.keywords || []), newKeyword.trim()] });
      setNewKeyword('');
    }
  };

  const removeKeyword = (index) => {
    setForm({ ...form, keywords: form.keywords.filter((_, i) => i !== index) });
  };

  const addExample = () => {
    if (newExample.trim()) {
      setForm({ ...form, examples: [...(form.examples || []), newExample.trim()] });
      setNewExample('');
    }
  };

  const removeExample = (index) => {
    setForm({ ...form, examples: form.examples.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('El nombre de la intención es obligatorio');
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h4 className="text-lg font-bold text-gray-800 mb-4">
          {intent?.id ? '✏️ Editar Intención' : '➕ Nueva Intención'}
        </h4>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información Básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Intención *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="ej: horarios, ubicacion, precios"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Intención Activa</span>
              </label>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Keywords (Palabras Clave)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Agregar keyword..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <button type="button" onClick={addKeyword} className="bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600">
                ➕
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.keywords?.map((keyword, index) => (
                <span key={index} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  {keyword}
                  <button type="button" onClick={() => removeKeyword(index)} className="text-purple-500 hover:text-purple-700">
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Respuesta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta de la Intención *</label>
            <textarea
              name="response"
              value={form.response}
              onChange={handleChange}
              required
              rows="4"
              placeholder="¿Cómo debe responder el chatbot cuando detecte esta intención?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Ejemplos de Entrenamiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ejemplos de Entrenamiento</label>
            <p className="text-xs text-gray-500 mb-2">Frases de ejemplo que los usuarios podrían escribir para esta intención</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                placeholder="ej: ¿a qué hora abren?"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExample())}
              />
              <button type="button" onClick={addExample} className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600">
                ➕
              </button>
            </div>
            <div className="space-y-1">
              {form.examples?.map((example, index) => (
                <div key={index} className="bg-green-50 text-green-700 px-3 py-2 rounded text-sm flex items-center justify-between">
                  <span>"{example}"</span>
                  <button type="button" onClick={() => removeExample(index)} className="text-green-500 hover:text-green-700 ml-2">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">
              {intent?.id ? 'Guardar Cambios' : 'Crear Intención'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Chatbots = () => {
  const [chatbots, setChatbots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', organizationId: '', aiConfig: { provider: '' }, whatsappConfig: { provider: '' } })
  const [externalDatabases, setExternalDatabases] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [organizations, setOrganizations] = useState([])
  const [showEdit, setShowEdit] = useState(false)
  const [editChatbot, setEditChatbot] = useState(null)

  // 🤖 Función para manejar cambio de tipo de chatbot
  const handleChatbotTypeChange = (type, currentForm, setForm) => {
    if (!type || !CHATBOT_TYPES[type]) return;
    
    const selectedType = CHATBOT_TYPES[type];
    console.log(`🤖 Cambiando a tipo: ${selectedType.name}`);
    
    // Actualizar el formulario con las características del tipo seleccionado
    setForm(prevForm => ({
      ...prevForm,
      chatbotType: type,
      // Aplicar características específicas del tipo
      ...selectedType.features,
      // Mantener valores existentes si ya están configurados
      chatbotConfig: {
        ...prevForm.chatbotConfig,
        chatbotType: type,
        typeName: selectedType.name,
        processor: type === 'ecommerce' ? 'valery' : type,
        customPrompts: selectedType.prompts,
        ...selectedType.features
      }
    }));
  };

  useEffect(() => {
    api.getChatbots().then(res => setChatbots(res.data || [])).finally(() => setLoading(false))
    api.getOrganizations().then(res => setOrganizations(res.data || []))
    // Cargar bases de datos externas configuradas
    api.getDatabaseConfigs().then(res => {
      setExternalDatabases(res.data || [])
    }).catch(err => {
      console.log('No se pudieron cargar las BD externas:', err.message)
    })
  }, [])

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    // Si cambia el proveedor de IA, resetea el modelo
    if (name === 'aiProvider') {
      setForm(f => ({ ...f, aiProvider: value, aiModel: '' }));
    } else {
      setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    }
  }

  const handleAIConfigChange = e => {
    setForm({ ...form, aiConfig: { ...form.aiConfig, [e.target.name]: e.target.value } })
  }

  const handleWhatsappConfigChange = e => {
    setForm({ ...form, whatsappConfig: { ...form.whatsappConfig, [e.target.name]: e.target.value } })
  }

  // Función para generar slug seguro
  function slugifyForUrl(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .substring(0, 40);
  }

  const handleCreateChatbot = async (formData) => {
    setError('');
    if (!formData.name || !formData.organizationId) return setError('Nombre y organización son obligatorios');
    // Validar API key solo para proveedores que no sean DeepSeek
    if (formData.aiProvider !== 'deepseek' && !formData.aiApiKey) {
      return setError('API Key es obligatoria para el proveedor seleccionado');
    }
    setSubmitting(true);
    try {
      // Transformar datos del formulario plano a estructura anidada que espera el backend
      const payload = {
        name: formData.name,
        description: formData.description || '',
        organizationId: formData.organizationId,
        slug: formData.slug || slugifyForUrl(formData.name),
        
        // Configuración de IA (automática con DeepSeek para SaaS)
        aiConfig: {
          provider: formData.aiProvider || 'deepseek',
          model: formData.aiModel || 'deepseek-chat',
          apiKey: formData.aiProvider === 'deepseek' ? '' : (formData.aiApiKey || ''), // DeepSeek usa variable de entorno
          maxTokens: 4000,
          temperature: formData.temperature || 0.7,
          whisperApiKey: formData.whisperApiKey || '',
          whisperUrl: formData.whisperUrl || 'https://api.openai.com/v1/audio/transcriptions',
          visionApiKey: formData.googleVisionApiKey || '',
          visionUrl: formData.googleVisionUrl || 'https://vision.googleapis.com/v1/images:annotate'
        },
        
        // Configuración de WhatsApp (SaaS fija)
        whatsappConfig: {
          provider: 'evolution-api',                    // Fijo: Evolution API
          instanceName: formData.instanceName || '',
          apiUrl: 'https://api.zemog.info',            // Fijo: URL SaaS
          apiKey: 'Jesus88192*',                       // Fijo: API Key SaaS
          webhookUrl: formData.webhookUrl || '',
          phoneNumber: formData.phoneNumber || ''
        },
        
        // Configuración de BD Externa (usar BD seleccionada de las configuradas)
        externalDbConfig: formData.selectedExternalDb ? {
          enabled: true,
          configId: formData.selectedExternalDb
        } : {
          enabled: false
        },
        
        // Configuración del Chatbot
        chatbotConfig: {
          personality: 'friendly',
          language: 'es',
          timezone: 'America/Caracas',
          useEmojis: true,
          responseTimeMs: 1000,
          maxCartItems: 50,
          sessionTimeoutHours: 24,
          enableSentimentAnalysis: false,
          enableSpellCorrection: false,
          // Configuración específica del tipo de chatbot
          chatbotType: formData.chatbotType || 'basico',
          typeName: CHATBOT_TYPES[formData.chatbotType]?.name || 'Chatbot Básico',
          processor: formData.chatbotType === 'ecommerce' ? 'valery' : (formData.chatbotType || 'basic'),
          customPrompts: CHATBOT_TYPES[formData.chatbotType]?.prompts || {},
          // Prompts personalizados del usuario
          systemPrompt: formData.systemPrompt || CHATBOT_TYPES[formData.chatbotType]?.prompts?.system || '',
          userContext: formData.userContext || CHATBOT_TYPES[formData.chatbotType]?.prompts?.userContext || '',
          specificInstructions: formData.specificInstructions || CHATBOT_TYPES[formData.chatbotType]?.prompts?.instructions || '',
          knowledgeBase: formData.knowledgeBase || CHATBOT_TYPES[formData.chatbotType]?.prompts?.knowledge || '',
          // Estado de las intenciones
          disableIntentMatching: formData.disableIntentMatching || false,
          // Características específicas del tipo
          ...CHATBOT_TYPES[formData.chatbotType]?.features
        },
        
        // Configuración de Notificaciones
        notificationConfig: {
          cartReminders: true,
          specialOffers: true,
          statusUpdates: true,
          reminderIntervalHours: 24,
          maxReminders: 3
        }
      };
      
      console.log('📤 Enviando payload estructurado:', JSON.stringify(payload, null, 2));
      
      const res = await api.createChatbot(payload);
      const chatbot = res.data || res;
      if (!chatbot.id && !chatbot._id) throw new Error('El backend no retornó un id para el chatbot');
      
      // SIEMPRE actualizar la webhook URL con el ID real del chatbot
      const realChatbotId = chatbot.id;
      
      // Generar la URL correcta del webhook usando la configuración centralizada
      const realWebhookUrl = generateWebhookUrl(realChatbotId);
      
      console.log('🔄 Actualizando webhook URL automáticamente...');
      console.log('📋 ID del chatbot creado:', realChatbotId);
      console.log('📋 URL temporal enviada:', payload.whatsappConfig.webhookUrl);
      console.log('📋 URL real generada:', realWebhookUrl);
      
      // SIEMPRE actualizar el webhook con el ID real (no solo si needsWebhookUpdate)
      try {
        await api.updateChatbot(realChatbotId, {
          ...chatbot,
          whatsappConfig: {
            ...chatbot.whatsappConfig,
            webhookUrl: realWebhookUrl
          }
        });
        console.log('✅ Webhook URL actualizada exitosamente:', realWebhookUrl);
        // Actualizar el objeto local también
        chatbot.whatsappConfig.webhookUrl = realWebhookUrl;
      } catch (updateError) {
        console.error('❌ Error actualizando webhook URL:', updateError.message);
        // No lanzar error, continuar con la creación del chatbot
      }
      
      setChatbots([chatbot, ...chatbots]);
      setShowCreate(false);
      setForm({ name: '', organizationId: '', aiConfig: { provider: '' }, whatsappConfig: { provider: '' } });
    } catch (err) {
      setError(err.message || 'Error al crear chatbot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditChatbot = async (formData) => {
    setError('');
    if (!formData.name || !formData.organizationId) return setError('Nombre y organización son obligatorios');
    // Validar API key solo para proveedores que no sean DeepSeek
    if (formData.aiProvider !== 'deepseek' && !formData.aiApiKey) {
      return setError('API Key es obligatoria para el proveedor seleccionado');
    }
    setSubmitting(true);
    try {
      // Transformar datos del formulario plano a estructura anidada que espera el backend
      const payload = {
        name: formData.name,
        description: formData.description || '',
        organizationId: formData.organizationId,
        slug: formData.slug || slugifyForUrl(formData.name),
        
        // Configuración de IA (automática con DeepSeek para SaaS)
        aiConfig: {
          provider: formData.aiProvider || 'deepseek',
          model: formData.aiModel || 'deepseek-chat',
          apiKey: formData.aiProvider === 'deepseek' ? '' : (formData.aiApiKey || ''), // DeepSeek usa variable de entorno
          maxTokens: 4000,
          temperature: formData.temperature || 0.7,
          whisperApiKey: formData.whisperApiKey || '',
          whisperUrl: formData.whisperUrl || 'https://api.openai.com/v1/audio/transcriptions',
          visionApiKey: formData.googleVisionApiKey || '',
          visionUrl: formData.googleVisionUrl || 'https://vision.googleapis.com/v1/images:annotate'
        },
        
        // Configuración de WhatsApp (SaaS fija)
        whatsappConfig: {
          provider: 'evolution-api',                    // Fijo: Evolution API
          instanceName: formData.instanceName || '',
          apiUrl: 'https://api.zemog.info',            // Fijo: URL SaaS
          apiKey: 'Jesus88192*',                       // Fijo: API Key SaaS
          webhookUrl: formData.webhookUrl || '',
          phoneNumber: formData.phoneNumber || ''
        },
        
        // Configuración de BD Externa (usar BD seleccionada de las configuradas)
        externalDbConfig: formData.selectedExternalDb ? {
          enabled: true,
          configId: formData.selectedExternalDb
        } : {
          enabled: false
        },
        
        // Configuración del Chatbot
        chatbotConfig: {
          personality: 'friendly',
          language: 'es',
          timezone: 'America/Caracas',
          useEmojis: true,
          responseTimeMs: 1000,
          maxCartItems: 50,
          sessionTimeoutHours: 24,
          enableSentimentAnalysis: false,
          enableSpellCorrection: false,
          // Configuración específica del tipo de chatbot
          chatbotType: formData.chatbotType || 'basico',
          typeName: CHATBOT_TYPES[formData.chatbotType]?.name || 'Chatbot Básico',
          processor: formData.chatbotType === 'ecommerce' ? 'valery' : (formData.chatbotType || 'basic'),
          customPrompts: CHATBOT_TYPES[formData.chatbotType]?.prompts || {},
          // Prompts personalizados del usuario
          systemPrompt: formData.systemPrompt || CHATBOT_TYPES[formData.chatbotType]?.prompts?.system || '',
          userContext: formData.userContext || CHATBOT_TYPES[formData.chatbotType]?.prompts?.userContext || '',
          specificInstructions: formData.specificInstructions || CHATBOT_TYPES[formData.chatbotType]?.prompts?.instructions || '',
          knowledgeBase: formData.knowledgeBase || CHATBOT_TYPES[formData.chatbotType]?.prompts?.knowledge || '',
          // Estado de las intenciones
          disableIntentMatching: formData.disableIntentMatching || false,
          // Características específicas del tipo
          ...CHATBOT_TYPES[formData.chatbotType]?.features
        },
        
        // Configuración de Notificaciones
        notificationConfig: {
          cartReminders: true,
          specialOffers: true,
          statusUpdates: true,
          reminderIntervalHours: 24,
          maxReminders: 3
        }
      };
      
      const res = await api.updateChatbot(editChatbot.id, payload);
      const updated = res.data || res;
      setChatbots(chatbots.map(c => c.id === editChatbot.id ? updated : c));
      setShowEdit(false);
      setEditChatbot(null);
    } catch (err) {
      setError(err.message || 'Error al actualizar chatbot');
    } finally {
      setSubmitting(false);
    }
  };

  // Componente reutilizable para el formulario de Chatbot
  function ChatbotForm({ initialValues, onSubmit, onCancel, title, submitting, error, organizations, externalDatabases = [] }) {
    const [form, setForm] = React.useState(initialValues);
    const [touched, setTouched] = React.useState(false);

    // Solo actualiza el form local si cambian los initialValues y el usuario no ha tocado el formulario
    React.useEffect(() => {
      setForm(prev => {
        // Si el usuario ya tocó el formulario, no sobrescribas
        if (touched) return prev;
        // Validar modelo de IA
        const aiProvider = initialValues.aiProvider || '';
        const aiModel = initialValues.aiModel || '';
        const validModels = (AI_MODELS[aiProvider] || []).map(m => m.value);
        return {
          ...initialValues,
          aiModel: aiModel && validModels.includes(aiModel) ? aiModel : ''
        };
      });
      setTouched(false);
    }, [initialValues]);

    // Cuando el usuario edita cualquier campo, marcamos como tocado
    const handleChange = e => {
      setTouched(true);
      const { name, value, type, checked } = e.target;
      // Si cambia el proveedor de IA, resetea el modelo si no es válido
      if (name === 'aiProvider') {
        setForm(f => {
          const validModels = (AI_MODELS[value] || []).map(m => m.value);
          return {
            ...f,
            aiProvider: value,
            aiModel: validModels.includes(f.aiModel) ? f.aiModel : ''
          };
        });
      } else {
        setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
      }
    };

    // Funciones auxiliares para los botones Auto/Test del webhook
    function generateWebhookUrlLocal(name, chatbotId) {
      // Usar la función centralizada de configuración
      return generateWebhookUrl(chatbotId, name);
    }
    function testWebhookEndpoint(url) {
      if (!url) return alert('URL vacía');
      
      // Mostrar un mensaje más informativo
      const isTemporary = url.includes('nuevo-chatbot') || /\-\d{6}$/.test(url.split('/').pop());
      
      if (isTemporary) {
        alert(`⚠️ URL Temporal Detectada\n\n` +
              `Esta es una URL temporal generada automáticamente.\n` +
              `Se actualizará con el ID real cuando crees el chatbot.\n\n` +
              `URL: ${url}\n\n` +
              `✅ Esto es normal y esperado.`);
      } else {
        // Para URLs reales, hacer una llamada de prueba
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true, from: 'test@frontend' })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert(`✅ Webhook Test Exitoso!\n\nURL: ${url}\nRespuesta: ${JSON.stringify(data, null, 2)}`);
          } else {
            alert(`⚠️ Webhook Respondió con Error\n\nURL: ${url}\nError: ${data.error || 'Error desconocido'}`);
          }
        })
        .catch(error => {
          alert(`❌ Error de Conexión\n\nURL: ${url}\nError: ${error.message}`);
        });
      }
    }

    // Submit
    const handleSubmit = e => {
      e.preventDefault();
      onSubmit(form);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 focus:outline-none">
            <i className="fas fa-times"></i>
          </button>
        </div>
        {/* ================= Información Básica ================= */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-blue-800 mb-3">📋 Información Básica</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organización *</label>
              <select name="organizationId" value={form.organizationId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Seleccionar organización...</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="Mi Chatbot de Ventas" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea name="description" value={form.description || ''} onChange={handleChange} placeholder="Descripción del chatbot" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        
        {/* ================= Selector de Tipo de Chatbot ================= */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
          <h4 className="text-lg font-bold text-blue-800 mb-4">🤖 Tipo de Chatbot</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(CHATBOT_TYPES).map(([key, type]) => (
              <div 
                key={key}
                onClick={() => handleChatbotTypeChange(key, form, setForm)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  form.chatbotType === key 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{type.icon}</div>
                  <h5 className="font-semibold text-gray-800 mb-1">{type.name}</h5>
                  <p className="text-xs text-gray-600">{type.description}</p>
                  {form.chatbotType === key && (
                    <div className="mt-2 text-xs text-blue-600">
                      ✅ Seleccionado
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Mostrar características del tipo seleccionado */}
          {form.chatbotType && CHATBOT_TYPES[form.chatbotType] && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
              <h5 className="font-semibold text-blue-800 mb-2">
                🎯 Características de {CHATBOT_TYPES[form.chatbotType].name}:
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {Object.entries(CHATBOT_TYPES[form.chatbotType].features).map(([feature, enabled]) => (
                  enabled && (
                    <div key={feature} className="flex items-center text-green-600">
                      <span className="mr-1">✅</span>
                      <span className="capitalize">{feature.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* ================= Configuración de IA (SaaS Flexible) ================= */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-200">
          <h4 className="text-lg font-bold text-green-800 mb-4">🧠 Configuración de IA (Modelo Flexible)</h4>
          
          {/* Banner de DeepSeek gratuito */}
          <div className="bg-gradient-to-r from-blue-100 to-green-100 p-4 rounded-lg border-2 border-blue-300 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-2xl mr-3">🎁</div>
                <div>
                  <h5 className="font-bold text-blue-800">DeepSeek - Recomendado y Por Defecto</h5>
                  <p className="text-sm text-blue-600">Modelo gratuito optimizado para conversaciones. Seleccionado automáticamente.</p>
                </div>
              </div>
              <div className="text-green-600 font-bold text-lg">GRATIS</div>
            </div>
          </div>
          
          {/* Selector de Proveedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🤖 Proveedor de IA</label>
              <select 
                name="aiProvider" 
                value={form.aiProvider || 'deepseek'} 
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="deepseek">🎁 DeepSeek (Gratis - Recomendado) ⭐</option>
                <option value="openai">🔥 OpenAI (GPT-3.5, GPT-4)</option>
                <option value="anthropic">🧠 Anthropic (Claude)</option>
                <option value="google">🌟 Google (Gemini)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">⚡ Modelo</label>
              <select 
                name="aiModel" 
                value={form.aiModel || 'deepseek-chat'} 
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {!form.aiProvider && <option value="">Seleccionar modelo...</option>}
                {(AI_MODELS[form.aiProvider || 'deepseek'] || []).map(model => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Información del modelo seleccionado */}
          <div className="bg-white p-4 rounded-lg border border-green-300 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {form.aiProvider === 'deepseek' ? '🎁' : 
                   form.aiProvider === 'openai' ? '🔥' : 
                   form.aiProvider === 'anthropic' ? '🧠' : 
                   form.aiProvider === 'google' ? '🌟' : '🤖'}
                </div>
                <h5 className="font-semibold text-gray-800">Proveedor</h5>
                <p className={`font-medium ${form.aiProvider === 'deepseek' ? 'text-green-600' : 'text-blue-600'}`}>
                  {form.aiProvider === 'deepseek' ? 'DeepSeek (Gratis)' : 
                   form.aiProvider === 'openai' ? 'OpenAI' : 
                   form.aiProvider === 'anthropic' ? 'Anthropic' : 
                   form.aiProvider === 'google' ? 'Google' : 'Sin seleccionar'}
                </p>
                <p className="text-xs text-gray-500">
                  {form.aiProvider === 'deepseek' ? 'Sin costo adicional' : 'Requiere suscripción'}
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">⚡</div>
                <h5 className="font-semibold text-gray-800">Modelo</h5>
                <p className="text-blue-600 font-medium">
                  {AI_MODELS[form.aiProvider || 'deepseek']?.find(m => m.value === form.aiModel)?.label || 'Sin seleccionar'}
                </p>
                <p className="text-xs text-gray-500">Modelo de lenguaje</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🎛️</div>
                <h5 className="font-semibold text-gray-800">Temperatura</h5>
                <div className="flex items-center justify-center">
                  <input 
                    type="range" 
                    name="temperature" 
                    min="0" 
                    max="1" 
                    step="0.1" 
                    value={form.temperature || 0.7} 
                    onChange={handleChange}
                    className="w-16 mr-2"
                  />
                  <span className="text-blue-600 font-medium">{form.temperature || 0.7}</span>
                </div>
                <p className="text-xs text-gray-500">Creatividad vs Precisión</p>
              </div>
            </div>
          </div>
          
          {/* Advertencia para modelos de pago */}
          {form.aiProvider !== 'deepseek' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-2xl">⚠️</div>
                </div>
                <div className="ml-3">
                  <h5 className="text-sm font-medium text-yellow-800">Modelo de Pago Seleccionado</h5>
                  <p className="text-sm text-yellow-700">
                    Has seleccionado un modelo que requiere suscripción o pago por uso. 
                    Asegúrate de tener una cuenta activa con {form.aiProvider === 'openai' ? 'OpenAI' : 
                    form.aiProvider === 'anthropic' ? 'Anthropic' : 
                    form.aiProvider === 'google' ? 'Google' : 'el proveedor'}.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Campo para API Key - Solo para proveedores que no sean DeepSeek */}
          {form.aiProvider !== 'deepseek' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔑 API Key {form.aiProvider === 'openai' ? 'de OpenAI' : 
                          form.aiProvider === 'anthropic' ? 'de Anthropic' : 
                          form.aiProvider === 'google' ? 'de Google' : ''} *
              </label>
              <input 
                name="aiApiKey" 
                type="password" 
                value={form.aiApiKey || ''} 
                onChange={handleChange} 
                required={form.aiProvider !== 'deepseek'}
                placeholder={form.aiProvider === 'openai' ? 'sk-...' : 
                            form.aiProvider === 'anthropic' ? 'sk-ant-...' : 
                            form.aiProvider === 'google' ? 'AIza...' : 'Ingresa tu API key'} 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
              />
              <p className="text-xs text-gray-500 mt-1">
                💰 Este proveedor requiere una cuenta de pago. Los costos son por tu cuenta.
              </p>
            </div>
          )}
          
          {/* Mensaje para DeepSeek */}
          {form.aiProvider === 'deepseek' && (
            <div className="bg-green-100 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🎁</div>
                </div>
                <div className="ml-3">
                  <h5 className="text-sm font-medium text-green-800">DeepSeek Configurado Automáticamente</h5>
                  <p className="text-sm text-green-700">
                    DeepSeek ya está configurado con una API key por defecto. No necesitas ingresar ninguna clave adicional.
                    Este modelo es completamente gratuito para el SaaS.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* ================= 🎯 GESTIÓN DE INTENCIONES SaaS ================= */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border-2 border-purple-200 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold text-purple-800">🎯 Gestión de Intenciones (SaaS)</h4>
            
            {/* Botón de toggle para activar/desactivar intenciones */}
            <div className="flex items-center bg-white px-4 py-2 rounded-lg border border-purple-300 shadow-sm">
              <span className="mr-3 text-sm font-medium text-gray-700">Intenciones:</span>
              <label className="inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!form.disableIntentMatching} 
                  onChange={(e) => {
                    const intentionsEnabled = e.target.checked;
                    setForm(f => ({ 
                      ...f, 
                      disableIntentMatching: !intentionsEnabled,
                      chatbotConfig: {
                        ...f.chatbotConfig,
                        disableIntentMatching: !intentionsEnabled
                      },
                      // Actualizar configuraciones relacionadas
                      aiFirst: !intentionsEnabled, // Si desactivamos intenciones, priorizamos IA
                      intentProcessingMode: !intentionsEnabled ? 'ai_only' : 'hybrid',
                      forceAIProcessing: !intentionsEnabled,
                    }));
                  }} 
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-700">
                  {form.disableIntentMatching ? 'Desactivadas' : 'Activadas'}
                </span>
              </label>
            </div>
          </div>
          
          {/* Opciones avanzadas de configuración de intenciones */}
          <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-semibold text-purple-800">⚙️ Configuración Avanzada</h5>
              <button 
                type="button"
                onClick={() => setForm(f => ({ 
                  ...f, 
                  showAdvancedIntentConfig: !f.showAdvancedIntentConfig 
                }))}
                className="text-xs text-purple-600 hover:text-purple-800"
              >
                {form.showAdvancedIntentConfig ? 'Ocultar opciones' : 'Mostrar opciones'} ▾
              </button>
            </div>
            
            {form.showAdvancedIntentConfig && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pt-3 border-t border-purple-100">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Modo de Procesamiento</label>
                  <select
                    name="intentProcessingMode"
                    value={form.intentProcessingMode || 'hybrid'}
                    onChange={(e) => setForm(f => ({ 
                      ...f, 
                      intentProcessingMode: e.target.value,
                      chatbotConfig: {
                        ...f.chatbotConfig,
                        intentProcessingMode: e.target.value
                      }
                    }))}
                    disabled={form.disableIntentMatching}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="hybrid">Híbrido (Intenciones + IA)</option>
                    <option value="intents_first">Intenciones Primero</option>
                    <option value="ai_only">Solo IA</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Determina el flujo de procesamiento de mensajes</p>
                </div>
                
                <div>
                  <label className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      checked={form.aiFirst || false}
                      onChange={(e) => setForm(f => ({ 
                        ...f, 
                        aiFirst: e.target.checked,
                        chatbotConfig: {
                          ...f.chatbotConfig,
                          aiFirst: e.target.checked
                        }
                      }))}
                      disabled={form.disableIntentMatching}
                      className="mr-2 disabled:opacity-50"
                    />
                    <span className="text-xs font-medium text-gray-700">Priorizar IA</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-5">La IA decide antes que las intenciones</p>
                </div>
                
                <div>
                  <label className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      checked={form.forceAIProcessing || false}
                      onChange={(e) => setForm(f => ({ 
                        ...f, 
                        forceAIProcessing: e.target.checked,
                        chatbotConfig: {
                          ...f.chatbotConfig,
                          forceAIProcessing: e.target.checked
                        }
                      }))}
                      disabled={form.disableIntentMatching}
                      className="mr-2 disabled:opacity-50"
                    />
                    <span className="text-xs font-medium text-gray-700">Forzar procesamiento IA</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-5">Usar IA incluso si hay coincidencia de intención</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Intent Manager Component - mostrarlo solo si las intenciones están activadas */}
          {!form.disableIntentMatching && (
            <IntentManager 
              chatbotType={form.chatbotType}
              intents={form.intents || []}
              onChange={(intents) => setForm(f => ({ ...f, intents }))}
            />
          )}
          
          {/* Mensaje cuando las intenciones están desactivadas */}
          {form.disableIntentMatching && (
            <div className="bg-white p-6 rounded-lg border-2 border-dashed border-purple-200 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <h5 className="text-lg font-semibold text-purple-800 mb-2">Intenciones Desactivadas</h5>
              <p className="text-gray-600">Las intenciones predefinidas están desactivadas. El chatbot utilizará exclusivamente la IA para responder a todas las consultas.</p>
              <button 
                onClick={() => setForm(f => ({ 
                  ...f, 
                  disableIntentMatching: false,
                  chatbotConfig: {
                    ...f.chatbotConfig,
                    disableIntentMatching: false
                  }
                }))}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Activar Intenciones
              </button>
            </div>
          )}
        </div>

        {/* ================= 🎭 CONFIGURACIÓN DE PROMPTS Y CONTEXTO ================= */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border-2 border-yellow-200">
          <h4 className="text-lg font-bold text-orange-800 mb-4">🎭 Prompts y Contexto del Agente IA</h4>
          
          {/* System Prompt */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🤖 System Prompt (Contexto del Sistema)
            </label>
            <textarea 
              name="systemPrompt" 
              value={form.systemPrompt || CHATBOT_TYPES[form.chatbotType]?.prompts?.system || ''} 
              onChange={handleChange}
              rows="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              placeholder="Eres un asistente virtual experto en... Define aquí la personalidad, rol y contexto base del agente IA..."
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 <strong>System Prompt:</strong> Define la personalidad, conocimientos y comportamiento base del agente IA.
            </p>
          </div>

          {/* User Context */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👤 User Context (Contexto de Usuario)
            </label>
            <textarea 
              name="userContext" 
              value={form.userContext || CHATBOT_TYPES[form.chatbotType]?.prompts?.userContext || ''} 
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              placeholder="Los usuarios son clientes de... Están interesados en... Suelen preguntar sobre..."
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 <strong>User Context:</strong> Información sobre el perfil típico de usuarios y sus necesidades.
            </p>
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📋 Instrucciones Específicas
            </label>
            <textarea 
              name="specificInstructions" 
              value={form.specificInstructions || CHATBOT_TYPES[form.chatbotType]?.prompts?.instructions || ''} 
              onChange={handleChange}
              rows="5"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              placeholder="- Siempre pregunta por la cédula del cliente&#10;- Verifica disponibilidad antes de confirmar pedidos&#10;- Mantén un tono profesional pero amigable..."
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 <strong>Instrucciones:</strong> Reglas específicas de comportamiento y flujo de conversación.
            </p>
          </div>

          {/* Knowledge Base */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📚 Base de Conocimientos
            </label>
            <textarea 
              name="knowledgeBase" 
              value={form.knowledgeBase || CHATBOT_TYPES[form.chatbotType]?.prompts?.knowledge || ''} 
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              placeholder="Información específica sobre productos, servicios, precios, políticas de la empresa..."
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 <strong>Knowledge Base:</strong> Información específica del negocio que el agente debe conocer.
            </p>
          </div>

          {/* Prompt Preview */}
          <div className="bg-white p-4 rounded-lg border-2 border-dashed border-orange-300">
            <h5 className="font-semibold text-orange-800 mb-2">🔍 Vista Previa del Prompt Final</h5>
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
              <strong>System:</strong> {form.systemPrompt || CHATBOT_TYPES[form.chatbotType]?.prompts?.system || 'No definido'}<br/><br/>
              <strong>User Context:</strong> {form.userContext || CHATBOT_TYPES[form.chatbotType]?.prompts?.userContext || 'No definido'}<br/><br/>
              <strong>Instructions:</strong> {form.specificInstructions || CHATBOT_TYPES[form.chatbotType]?.prompts?.instructions || 'No definido'}
            </div>
          </div>
        </div>
        
        {/* ================= Configuración de Audio (Whisper) ================= */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-green-800 mb-3">🎵 Transcripción de Audio (Whisper)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key de Whisper</label>
              <input name="whisperApiKey" type="password" value={form.whisperApiKey || ''} onChange={handleChange} placeholder="sk-... (OpenAI API Key para Whisper)" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de Whisper</label>
              <input name="whisperUrl" type="url" value={form.whisperUrl || ''} onChange={handleChange} placeholder="https://api.openai.com/v1/audio/transcriptions" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        {/* ================= Configuración de Análisis de Imágenes (Google Vision) ================= */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-purple-800 mb-3">🖼️ Análisis de Imágenes (Google Vision)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key de Google Vision</label>
              <input name="googleVisionApiKey" type="password" value={form.googleVisionApiKey || ''} onChange={handleChange} placeholder="Google Cloud Vision API Key" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de Vision</label>
              <input name="googleVisionUrl" type="url" value={form.googleVisionUrl || ''} onChange={handleChange} placeholder="https://vision.googleapis.com/v1/images:annotate" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        {/* ================= Configuración de WhatsApp SaaS ================= */}
        <div className="bg-emerald-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-emerald-800 mb-3">📱 Configuración de WhatsApp (SaaS)</h4>
          
          {/* Información fija del SaaS */}
          <div className="bg-white p-3 rounded-lg border-2 border-emerald-200 mb-4">
            <h5 className="font-semibold text-emerald-700 mb-2">🔒 Configuración SaaS Fija:</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Proveedor:</span>
                <span className="ml-2 font-medium text-emerald-600">Evolution API</span>
              </div>
              <div>
                <span className="text-gray-600">URL API:</span>
                <span className="ml-2 font-medium text-emerald-600">api.zemog.info</span>
              </div>
              <div>
                <span className="text-gray-600">API Key:</span>
                <span className="ml-2 font-medium text-emerald-600">Jesus88192*</span>
              </div>
              <div>
                <span className="text-gray-600">Estado:</span>
                <span className="ml-2 font-medium text-green-600">✅ Configurado</span>
              </div>
            </div>
          </div>

          {/* Solo campo configurable: Nombre de Instancia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Instancia *</label>
              <input 
                name="instanceName" 
                value={form.instanceName || ''} 
                onChange={handleChange} 
                required 
                placeholder="mi-empresa-bot" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Único campo configurable. Debe ser único para cada cliente.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL *</label>
              <div className="flex gap-2">
                <input 
                  name="webhookUrl" 
                  type="url" 
                  value={form.webhookUrl || ''} 
                  onChange={handleChange} 
                  required 
                  placeholder="https://tu-servidor.com/api/whatsapp/webhook/{id}" 
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                />
                <button 
                  type="button" 
                  onClick={() => setForm(f => ({ ...f, webhookUrl: generateWebhookUrlLocal(f.name, f.id) }))} 
                  className="px-3 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors text-sm"
                >
                  🔗 Auto
                </button>
                <button 
                  type="button" 
                  onClick={() => testWebhookEndpoint(form.webhookUrl)} 
                  className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                >
                  🧪 Test
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Se genera automáticamente con el ID del chatbot.</p>
            </div>
          </div>
          
          {/* Campo opcional: Número de Teléfono */}
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Teléfono (Opcional)</label>
                <input 
                  name="phoneNumber" 
                  type="tel" 
                  value={form.phoneNumber || ''} 
                  onChange={handleChange} 
                  placeholder="+58412XXXXXXX" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                />
                <p className="text-xs text-gray-500 mt-1">Número asociado a la instancia (informativo).</p>
              </div>
            </div>
          </div>
        </div>
        {/* ================= Configuración de Base de Datos Externa (SaaS) ================= */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
          <h4 className="text-lg font-bold text-blue-800 mb-4">🗄️ Base de Datos Externa (Opcional)</h4>
          
          <div className="flex items-center mb-4">
            <input 
              type="checkbox" 
              name="externalDbEnabled" 
              checked={form.selectedExternalDb ? true : false} 
              onChange={(e) => {
                if (!e.target.checked) {
                  setForm(f => ({ ...f, selectedExternalDb: '' }));
                }
              }} 
              id="externalDbEnabled" 
              className="mr-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" 
            />
            <label htmlFor="externalDbEnabled" className="text-sm font-medium text-gray-700">
              Conectar a una base de datos externa preconfigurada
            </label>
          </div>
          
          {(form.selectedExternalDb || form.externalDbEnabled) && (
            <div className="space-y-4">
              {externalDatabases.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="text-yellow-400 text-xl mr-3">⚠️</div>
                    <div>
                      <h5 className="text-yellow-800 font-medium">No hay bases de datos configuradas</h5>
                      <p className="text-yellow-700 text-sm mt-1">
                        Primero debes configurar una base de datos externa en la sección "Base de Datos".
                      </p>
                      <button
                        type="button"
                        onClick={() => window.open('/database', '_blank')}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ir a configurar BD externa →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Base de Datos Configurada *
                  </label>
                  <select
                    name="selectedExternalDb"
                    value={form.selectedExternalDb || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar base de datos...</option>
                    {externalDatabases.map((db) => (
                      <option key={db.chatbotId} value={db.chatbotId}>
                        {db.description} ({db.databaseType.toUpperCase()}) - {db.tablesCount} tablas
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Estas bases de datos ya están configuradas y probadas. Solo selecciona la que quieres usar.
                  </p>
                  
                  {form.selectedExternalDb && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                      {(() => {
                        const selectedDb = externalDatabases.find(db => db.chatbotId === form.selectedExternalDb);
                        return selectedDb ? (
                          <div className="text-sm">
                            <div className="flex items-center text-green-800 font-medium mb-2">
                              <span className="text-green-500 mr-2">✅</span>
                              Base de datos seleccionada
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-green-700">
                              <div><strong>Tipo:</strong> {selectedDb.databaseType.toUpperCase()}</div>
                              <div><strong>Tablas:</strong> {selectedDb.tablesCount} configuradas</div>
                              <div><strong>Consultas:</strong> {selectedDb.queriesCount} predefinidas</div>
                              <div><strong>Estado:</strong> {selectedDb.isActive ? 'Activa' : 'Inactiva'}</div>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {/* ================= Estado y Configuración ================= */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-800 mb-3">⚙️ Estado y Configuración</h4>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input type="checkbox" name="isActive" checked={form.isActive || false} onChange={handleChange} className="mr-2" />
              <span className="text-sm font-medium text-gray-700">Chatbot Activo</span>
            </label>
            {form.externalDbEnabled && (
              <span className="text-sm text-green-600">🗄️ BD Externa Habilitada</span>
            )}
          </div>
        </div>
        {/* ================= Botones de acción ================= */}
        <div className="mt-6 flex justify-end space-x-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 flex items-center gap-2">
            <span>{title.includes('Crear') ? '🤖 Crear Chatbot' : '💾 Guardar Cambios'}</span>
            {submitting && <span className="animate-spin">⏳</span>}
          </button>
        </div>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        <input type="hidden" name="slug" value={form.slug || slugifyForUrl(form.name)} />
      </form>
    );
  }

  const openEditModal = chatbot => {
    setEditChatbot(chatbot);
    setForm({
      organizationId: chatbot.organizationId || chatbot.organization?.id || '',
      name: chatbot.name || '',
      description: chatbot.description || '',
      aiProvider: chatbot.aiProvider || chatbot.aiConfig?.provider || '',
      aiModel: chatbot.aiModel || chatbot.aiConfig?.model || '',
      aiApiKey: chatbot.aiApiKey || chatbot.aiConfig?.apiKey || '',
      temperature: chatbot.temperature || chatbot.aiConfig?.temperature || 0.7,
      whisperApiKey: chatbot.aiConfig?.whisperApiKey || '',
      whisperUrl: chatbot.aiConfig?.whisperUrl || 'https://api.openai.com/v1/audio/transcriptions',
      googleVisionApiKey: chatbot.aiConfig?.visionApiKey || '',
      googleVisionUrl: chatbot.aiConfig?.visionUrl || 'https://vision.googleapis.com/v1/images:annotate',
      whatsappProvider: 'evolution-api',                    // Fijo: Evolution API
      instanceName: chatbot.instanceName || chatbot.whatsappConfig?.instanceName || '',
      whatsappApiUrl: 'https://api.zemog.info',            // Fijo: URL SaaS
      whatsappApiKey: 'Jesus88192*',                       // Fijo: API Key SaaS
      webhookUrl: chatbot.webhookUrl || chatbot.whatsappConfig?.webhookUrl || '',
      phoneNumber: chatbot.phoneNumber || chatbot.whatsappConfig?.phoneNumber || '',
      externalDbEnabled: chatbot.externalDbEnabled || chatbot.externalDbConfig?.enabled || false,
      dbType: chatbot.dbType || chatbot.externalDbConfig?.type || 'mysql',
      dbHost: chatbot.dbHost || chatbot.externalDbConfig?.host || '',
      dbPort: chatbot.dbPort || chatbot.externalDbConfig?.port || 3306,
      dbUsername: chatbot.dbUsername || chatbot.externalDbConfig?.username || '',
      dbPassword: chatbot.dbPassword || chatbot.externalDbConfig?.password || '',
      dbDatabase: chatbot.dbDatabase || chatbot.externalDbConfig?.database || '',
      isActive: chatbot.isActive ?? true,
      chatbotType: chatbot.chatbotConfig?.chatbotType || chatbot.chatbotType || 'basico',
      systemPrompt: chatbot.chatbotConfig?.systemPrompt || chatbot.systemPrompt || '',
      userContext: chatbot.chatbotConfig?.userContext || chatbot.userContext || '',
      specificInstructions: chatbot.chatbotConfig?.specificInstructions || chatbot.specificInstructions || '',
      knowledgeBase: chatbot.chatbotConfig?.knowledgeBase || chatbot.knowledgeBase || '',
      disableIntentMatching: chatbot.chatbotConfig?.disableIntentMatching || false,
      aiFirst: chatbot.chatbotConfig?.aiFirst || false,
      intentProcessingMode: chatbot.chatbotConfig?.intentProcessingMode || 'hybrid',
      forceAIProcessing: chatbot.chatbotConfig?.forceAIProcessing || false,
      showAdvancedIntentConfig: false,
      intents: chatbot.chatbotConfig?.intents || []
    });
    setShowEdit(true);
    setError('');
  };

  const handleDelete = async (chatbot) => {
    // Confirmación de seguridad
    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar el chatbot "${chatbot.name}"?\n\n` +
      `⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER ⚠️\n\n` +
      `Se eliminarán:\n` +
      `• El chatbot y su configuración\n` +
      `• Todas las conversaciones (${chatbot.totalConversations || 0})\n` +
      `• Configuraciones de IA y WhatsApp\n` +
      `• Base de datos externa asociada\n\n` +
      `Escribe "ELIMINAR" para confirmar:`
    );

    if (!confirmDelete) return;

    // Doble confirmación con prompt
    const confirmation = window.prompt(
      `Para confirmar la eliminación de "${chatbot.name}", escribe exactamente: ELIMINAR`
    );

    if (confirmation !== 'ELIMINAR') {
      alert('Eliminación cancelada. No se escribió "ELIMINAR" correctamente.');
      return;
    }

    setSubmitting(true);
    try {
      await api.deleteChatbot(chatbot.id);
      setChatbots(chatbots.filter(c => c.id !== chatbot.id));
      alert(`✅ Chatbot "${chatbot.name}" eliminado exitosamente`);
    } catch (err) {
      alert(`❌ Error al eliminar chatbot: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🤖 Gestión de Chatbots</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <i className="fas fa-plus mr-2"></i>Nuevo Chatbot
        </button>
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={null} maxWidth="max-w-4xl">
        <ChatbotForm
          initialValues={{
            organizationId: '',
            name: '',
            description: '',
            aiProvider: 'deepseek',
            aiModel: 'deepseek-chat',
            aiApiKey: '',
            temperature: 0.7,
            whisperApiKey: '',
            whisperUrl: '',
            googleVisionApiKey: '',
            googleVisionUrl: '',
            whatsappProvider: '',
            instanceName: '',
            whatsappApiUrl: '',
            whatsappApiKey: '',
            webhookUrl: '',
            phoneNumber: '',
            externalDbEnabled: false,
            dbType: 'mysql',
            dbHost: '',
            dbPort: 3306,
            dbUsername: '',
            dbPassword: '',
            dbDatabase: '',
            selectedExternalDb: '',
            isActive: true,
            chatbotType: 'basico',
            systemPrompt: '',
            userContext: '',
            specificInstructions: '',
            knowledgeBase: '',
            disableIntentMatching: false,
            aiFirst: false,
            intentProcessingMode: 'hybrid',
            forceAIProcessing: false,
            showAdvancedIntentConfig: false,
            intents: []
          }}
          onSubmit={handleCreateChatbot}
          onCancel={() => setShowCreate(false)}
          title="🤖 Crear Nuevo Chatbot"
          submitting={submitting}
          error={error}
          organizations={organizations}
          externalDatabases={externalDatabases}
        />
      </Modal>
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={null} maxWidth="max-w-4xl">
        <ChatbotForm
          initialValues={form}
          onSubmit={handleEditChatbot}
          onCancel={() => setShowEdit(false)}
          title="✏️ Editar Chatbot"
          submitting={submitting}
          error={error}
          organizations={organizations}
          externalDatabases={externalDatabases}
        />
      </Modal>
      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {chatbots.map(chatbot => (
            <div key={chatbot.id || chatbot._id || chatbot.name} className="bg-white rounded-lg shadow-md overflow-hidden card-hover">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-robot text-white"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{chatbot.name}</h3>
                      <p className="text-sm text-gray-500">{chatbot.organization?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className={`w-3 h-3 rounded-full ${chatbot.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className={`text-xs font-medium ${chatbot.isActive ? 'text-green-600' : 'text-red-600'}`}>{chatbot.isActive ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">IA Provider:</span>
                    <span className="font-medium capitalize">{chatbot.aiConfig?.provider}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">WhatsApp:</span>
                    <span className="font-medium capitalize">{chatbot.whatsappConfig?.provider}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">BD Externa:</span>
                    <span className={`font-medium ${chatbot.externalDbConfig?.enabled ? 'text-green-600' : 'text-gray-400'}`}>{chatbot.externalDbConfig?.enabled ? 'Habilitada' : 'Deshabilitada'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Conversaciones:</span>
                    <span className="font-medium">{chatbot.totalConversations || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Tipo:</span>
                    <span className="font-medium text-purple-600">
                      {chatbot.chatbotConfig?.typeName || CHATBOT_TYPES[chatbot.chatbotConfig?.chatbotType]?.name || 'Básico'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEditModal(chatbot)}
                      className="bg-blue-50 text-blue-600 py-2 px-3 rounded text-sm hover:bg-blue-100 transition-colors"
                    >
                      <i className="fas fa-edit mr-1"></i>Editar
                    </button>
                    <button
                      // onClick={() => testChatbot(chatbot)}
                      className="bg-yellow-50 text-yellow-600 py-2 px-3 rounded text-sm hover:bg-yellow-100 transition-colors"
                    >
                      <i className="fas fa-vial mr-1"></i>Probar
                    </button>
                    <button
                      // onClick={() => toggleChatbot(chatbot)}
                      className={`py-2 px-3 rounded text-sm transition-colors ${chatbot.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                    >
                      <i className={`mr-1 ${chatbot.isActive ? 'fas fa-pause' : 'fas fa-play'}`}></i>
                      {chatbot.isActive ? 'Pausar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDelete(chatbot)}
                      className="bg-red-50 text-red-600 py-2 px-3 rounded text-sm hover:bg-red-100 transition-colors"
                    >
                      <i className="fas fa-trash mr-1"></i>Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Chatbots