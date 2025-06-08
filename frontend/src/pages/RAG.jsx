import React, { useState, useEffect } from 'react'
import { useNotification } from '../components/NotificationProvider'
import { useLoading } from '../components/LoadingProvider'
import { api } from '../services/api'
import RAGManager from '../components/RAGManager'

const RAG = () => {
  const [chatbots, setChatbots] = useState([])
  const [selectedChatbot, setSelectedChatbot] = useState('')
  const [knowledgeBases, setKnowledgeBases] = useState([])
  const [stats, setStats] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { showNotification } = useNotification()
  const { setLoading } = useLoading()
  const [loading, setLoadingState] = useState(true)
  const [systemStatus, setSystemStatus] = useState(null)

  // Estados del formulario de subida
  const [uploadForm, setUploadForm] = useState({
    file: null,
    title: '',
    category: '',
    tags: '',
    url: ''
  })

  // Estado del formulario de prueba
  const [testForm, setTestForm] = useState({
    query: '',
    maxResults: 5,
    similarityThreshold: 0.7
  })

  const [testResults, setTestResults] = useState(null)

  useEffect(() => {
    loadChatbots()
  }, [])

  useEffect(() => {
    if (selectedChatbot) {
      loadKnowledgeBases()
      loadStats()
    }
  }, [selectedChatbot])

  useEffect(() => {
    const loadSystemStatus = async () => {
      try {
        const response = await api.health()
        setSystemStatus(response)
      } catch (error) {
        console.error('Error loading system status:', error)
        setSystemStatus({ status: 'error', message: 'No se pudo conectar al sistema' })
      }
    }

    loadSystemStatus()
  }, [])

  const loadChatbots = async () => {
    try {
      setLoadingState(true)
      const response = await api.getChatbots()
      setChatbots(response.data || [])
      
      // Seleccionar el primer chatbot por defecto
      if (response.data && response.data.length > 0) {
        setSelectedChatbot(response.data[0].id)
      }
    } catch (error) {
      console.error('Error loading chatbots:', error)
      showNotification('error', 'Error', 'No se pudieron cargar los chatbots')
    } finally {
      setLoadingState(false)
    }
  }

  const loadKnowledgeBases = async () => {
    if (!selectedChatbot) return
    
    try {
      const response = await api.getRAGKnowledgeBases(selectedChatbot)
      setKnowledgeBases(response.data || [])
    } catch (error) {
      console.error('Error loading knowledge bases:', error)
    }
  }

  const loadStats = async () => {
    if (!selectedChatbot) return
    
    try {
      const response = await api.getRAGStats(selectedChatbot)
      setStats(response.data || null)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    
    if (!uploadForm.file && !uploadForm.url) {
      showNotification('error', 'Error', 'Selecciona un archivo o proporciona una URL')
      return
    }

    try {
      setLoading(true)
      setUploadProgress(0)

      let result
      
      if (uploadForm.file) {
        // Subir archivo
        const formData = new FormData()
        formData.append('file', uploadForm.file)
        formData.append('title', uploadForm.title || uploadForm.file.name)
        formData.append('category', uploadForm.category)
        formData.append('tags', uploadForm.tags)

        result = await api.uploadRAGDocument(selectedChatbot, formData)
      } else if (uploadForm.url) {
        // Procesar URL
        result = await api.processRAGUrl({
          chatbotId: selectedChatbot,
          url: uploadForm.url,
          title: uploadForm.title,
          category: uploadForm.category,
          tags: uploadForm.tags.split(',').map(t => t.trim()).filter(t => t)
        })
      }

      showNotification('success', 'Éxito', 'Documento procesado exitosamente')
      setShowUploadModal(false)
      resetUploadForm()
      loadKnowledgeBases()
      loadStats()
      
    } catch (error) {
      showNotification('error', 'Error', error.message)
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleTestRAG = async (e) => {
    e.preventDefault()
    
    if (!testForm.query.trim()) {
      showNotification('error', 'Error', 'Ingresa una consulta para probar')
      return
    }

    try {
      setLoading(true)
      const response = await api.queryRAG({
        chatbotId: selectedChatbot,
        query: testForm.query,
        maxResults: testForm.maxResults,
        similarityThreshold: testForm.similarityThreshold
      })

      setTestResults(response.data)
      
      if (response.data.chunks && response.data.chunks.length > 0) {
        showNotification('success', 'Consulta exitosa', `Se encontraron ${response.data.chunks.length} resultados relevantes`)
      } else {
        showNotification('info', 'Sin resultados', 'No se encontraron documentos relevantes para esta consulta')
      }
      
    } catch (error) {
      showNotification('error', 'Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteKnowledgeBase = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta base de conocimiento? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setLoading(true)
      await api.deleteRAGKnowledgeBase(id)
      showNotification('success', 'Éxito', 'Base de conocimiento eliminada')
      loadKnowledgeBases()
      loadStats()
    } catch (error) {
      showNotification('error', 'Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetUploadForm = () => {
    setUploadForm({
      file: null,
      title: '',
      category: '',
      tags: '',
      url: ''
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅'
      case 'processing': return '⏳'
      case 'failed': return '❌'
      default: return '📄'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'processing': return 'text-yellow-600 bg-yellow-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleRAGUpdate = () => {
    console.log('RAG updated for chatbot:', selectedChatbot)
  }

  const selectedChatbotData = chatbots.find(bot => bot.id === selectedChatbot)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Cargando sistema RAG...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">🧠 Sistema RAG</h1>
            <p className="text-purple-100">
              Retrieval-Augmented Generation - Gestión de Conocimiento Inteligente
            </p>
          </div>
          <div className="text-right">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="text-sm font-medium">Estado del Sistema</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`w-3 h-3 rounded-full ${
                  systemStatus?.status === 'ok' ? 'bg-green-400' : 'bg-red-400'
                }`}></span>
                <span className="text-sm">
                  {systemStatus?.status === 'ok' ? 'Operativo' : 'Con problemas'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <i className="fas fa-info-circle text-blue-600 text-xl mt-1"></i>
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">¿Qué es el Sistema RAG?</h3>
            <p className="text-blue-700 text-sm mb-3">
              El sistema RAG (Retrieval-Augmented Generation) permite que tus chatbots accedan a información específica 
              de tu negocio para dar respuestas más precisas y personalizadas.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-3 rounded border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-1">📚 Base de Conocimiento</h4>
                <p className="text-blue-600">Sube documentos, manuales y contenido que tu chatbot debe conocer</p>
              </div>
              <div className="bg-white p-3 rounded border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-1">🔍 Búsqueda Inteligente</h4>
                <p className="text-blue-600">El sistema encuentra automáticamente la información relevante</p>
              </div>
              <div className="bg-white p-3 rounded border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-1">🤖 Respuestas Precisas</h4>
                <p className="text-blue-600">Tu chatbot responde basándose en tu contenido específico</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chatbot Selector */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          🤖 Seleccionar Chatbot
        </h2>
        
        {chatbots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-robot text-4xl mb-4"></i>
            <p className="text-lg mb-2">No tienes chatbots creados</p>
            <p className="text-sm">Crea un chatbot primero para gestionar su base de conocimiento</p>
            <button
              onClick={() => window.location.href = '/chatbots'}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear Chatbot
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chatbots.map((chatbot) => (
                <div
                  key={chatbot.id}
                  onClick={() => setSelectedChatbot(chatbot.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedChatbot === chatbot.id
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-robot text-white"></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{chatbot.name}</h3>
                      <p className="text-sm text-gray-600">{chatbot.organization?.name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${
                          chatbot.isActive ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        <span className="text-xs text-gray-500">
                          {chatbot.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedChatbot === chatbot.id && (
                    <div className="mt-3 text-center">
                      <span className="text-xs text-purple-600 font-medium">
                        ✅ Seleccionado
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Selected Chatbot Info */}
            {selectedChatbotData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">
                  📋 Información del Chatbot Seleccionado
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <p className="font-medium text-purple-600">
                      {selectedChatbotData.chatbotConfig?.typeName || 'Básico'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">IA Provider:</span>
                    <p className="font-medium capitalize">
                      {selectedChatbotData.aiConfig?.provider || 'No configurado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Conversaciones:</span>
                    <p className="font-medium">
                      {selectedChatbotData.totalConversations || 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Organización:</span>
                    <p className="font-medium">
                      {selectedChatbotData.organization?.name || 'Sin organización'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RAG Manager */}
      {selectedChatbot && (
        <RAGManager 
          chatbotId={selectedChatbot}
          onRAGUpdate={handleRAGUpdate}
        />
      )}

      {/* Quick Start Guide */}
      {selectedChatbot && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">
            🚀 Guía de Inicio Rápido
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="text-2xl mb-2">1️⃣</div>
              <h4 className="font-medium text-green-800 mb-2">Agregar Contenido</h4>
              <p className="text-sm text-green-700">
                Sube documentos o agrega contenido manual sobre tu negocio, productos, servicios, etc.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="text-2xl mb-2">2️⃣</div>
              <h4 className="font-medium text-green-800 mb-2">Probar Consultas</h4>
              <p className="text-sm text-green-700">
                Usa la sección de pruebas para verificar que el chatbot puede encontrar la información correcta.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="text-2xl mb-2">3️⃣</div>
              <h4 className="font-medium text-green-800 mb-2">¡Listo para Usar!</h4>
              <p className="text-sm text-green-700">
                Tu chatbot ahora puede responder preguntas específicas basándose en tu contenido.
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h5 className="font-medium text-yellow-800 mb-2">💡 Consejos:</h5>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Organiza el contenido por categorías (productos, políticas, FAQ, etc.)</li>
              <li>• Usa tags descriptivos para facilitar la búsqueda</li>
              <li>• Mantén la información actualizada y relevante</li>
              <li>• Prueba regularmente que las respuestas sean precisas</li>
            </ul>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm py-4">
        <p>Sistema RAG - Gestión de Conocimiento Inteligente v2.0</p>
        <p>Potenciado por IA avanzada y búsqueda semántica</p>
      </div>
    </div>
  )
}

export default RAG 