import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showingStart, setShowingStart] = useState(0);
  const [showingEnd, setShowingEnd] = useState(0);
  const [total, setTotal] = useState(0);

  // Estados para modales
  const [showChatModal, setShowChatModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Estados para intervención humana
  const [botStatuses, setBotStatuses] = useState({});
  const [operatorName, setOperatorName] = useState('Operador');
  const [loadingBotAction, setLoadingBotAction] = useState(false);

  useEffect(() => {
    loadChatbots();
    loadSessions();
  }, [currentPage, selectedChatbot]);

  const loadChatbots = async () => {
    try {
      const response = await api.getChatbots();
      setChatbots(response.data);
    } catch (error) {
      console.error('Error loading chatbots:', error);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await api.getSessions({
        page: currentPage,
        limit: 10,
        chatbotId: selectedChatbot,
        search: searchQuery
      });
      
      // Verificar si hay error en la respuesta
      if (response.error) {
        console.error('API Error:', response.error, response.details);
        setSessions([]);
        setTotalPages(1);
        setTotal(0);
        setShowingStart(0);
        setShowingEnd(0);
        return;
      }
      
      // Asegurarse de que sessions sea siempre un array
      setSessions(Array.isArray(response.data) ? response.data : []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotal(response.meta?.total || 0);
      setShowingStart((currentPage - 1) * 10 + 1);
      setShowingEnd(Math.min(currentPage * 10, response.meta?.total || 0));
    } catch (error) {
      console.error('Error loading sessions:', error);
      // En caso de error, establecer un array vacío
      setSessions([]);
      setTotalPages(1);
      setTotal(0);
      setShowingStart(0);
      setShowingEnd(0);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId) => {
    try {
      setLoadingMessages(true);
      const response = await api.getSessionMessages(sessionId);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleViewChat = async (session) => {
    setSelectedSession(session);
    setShowChatModal(true);
    loadMessages(session.id);
    
    // Cargar estado del bot para la sesión
    try {
      const botStatus = await api.getBotStatus(session.id);
      setBotStatuses(prev => ({
        ...prev,
        [session.id]: botStatus.data
      }));
    } catch (error) {
      console.error('Error loading bot status:', error);
    }
  };

  const handleSendMessage = (session) => {
    setSelectedSession(session);
    setNewMessage('');
    setShowSendMessageModal(true);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedSession) return;

    try {
      setSendingMessage(true);
      await api.sendMessageToSession(selectedSession.id, newMessage);
      
      // Cerrar modal y recargar sesiones
      setShowSendMessageModal(false);
      setNewMessage('');
      loadSessions();
      
      // Mostrar mensaje de éxito
      alert('✅ Mensaje enviado correctamente');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('❌ Error enviando mensaje: ' + error.message);
    } finally {
      setSendingMessage(false);
    }
  };



  const getStatusBadge = (status) => {
    const badges = {
      'active': 'bg-green-100 text-green-800',
      'idle': 'bg-yellow-100 text-yellow-800',
      'ended': 'bg-gray-100 text-gray-800',
      'blocked': 'bg-red-100 text-red-800',
      'inactive': 'bg-gray-100 text-gray-600'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadSessions();
  };

  // Función para obtener el estado del bot para una sesión
  const getBotStatus = async (sessionId) => {
    try {
      setBotStatuses(prev => ({
        ...prev,
        [sessionId]: { ...prev[sessionId], loading: true }
      }))
      
      const response = await api.getBotStatus(sessionId)
      const isPaused = response.data?.botPaused || false
      
      setBotStatuses(prev => ({
        ...prev,
        [sessionId]: { isPaused, loading: false }
      }))
      
      return isPaused
    } catch (error) {
      console.error('Error getting bot status:', error)
      setBotStatuses(prev => ({
        ...prev,
        [sessionId]: { isPaused: false, loading: false }
      }))
      return false
    }
  }

  // Función para pausar el bot
  const pauseBot = async (sessionId) => {
    try {
      setBotStatuses(prev => ({
        ...prev,
        [sessionId]: { ...prev[sessionId], loading: true }
      }))
      
      const response = await api.pauseBot(sessionId)
      if (response.success) {
        setBotStatuses(prev => ({
          ...prev,
          [sessionId]: { isPaused: true, loading: false }
        }))
        alert('✅ Bot pausado correctamente')
      } else {
        throw new Error(response.details || 'Error pausando bot')
      }
    } catch (error) {
      console.error('Error pausing bot:', error)
      setBotStatuses(prev => ({
        ...prev,
        [sessionId]: { isPaused: false, loading: false }
      }))
      alert(`❌ Error pausando bot: ${error.message}`)
    }
  }

  // Función para reanudar el bot
  const resumeBot = async (sessionId) => {
    try {
      setBotStatuses(prev => ({
        ...prev,
        [sessionId]: { ...prev[sessionId], loading: true }
      }))
      
      const response = await api.resumeBot(sessionId)
      if (response.success) {
        setBotStatuses(prev => ({
          ...prev,
          [sessionId]: { isPaused: false, loading: false }
        }))
        alert('✅ Bot reanudado correctamente')
      } else {
        throw new Error(response.details || 'Error reanudando bot')
      }
    } catch (error) {
      console.error('Error resuming bot:', error)
      setBotStatuses(prev => ({
        ...prev,
        [sessionId]: { isPaused: true, loading: false }
      }))
      alert(`❌ Error reanudando bot: ${error.message}`)
    }
  }

  // Función para enviar mensaje manual
  const sendManualMessage = async (sessionId) => {
    if (!newMessage.trim()) {
      alert('Por favor escribe un mensaje')
      return
    }

    try {
      setSendingMessage(true)
      const response = await api.sendManualMessage(sessionId, newMessage, operatorName)
      
      if (response.success) {
        setNewMessage('')
        // Recargar mensajes para mostrar el nuevo mensaje
        await loadMessages(sessionId)
        alert('✅ Mensaje enviado correctamente')
      } else {
        throw new Error(response.details || 'Error enviando mensaje')
      }
    } catch (error) {
      console.error('Error sending manual message:', error)
      alert(`❌ Error enviando mensaje: ${error.message}`)
    } finally {
      setSendingMessage(false)
    }
  }

  // Función para enviar mensaje de chat normal
  const sendChatMessage = async () => {
    if (!newMessage.trim() || !selectedSession) {
      return
    }

    try {
      setSendingMessage(true)
      
      // Agregar mensaje temporalmente a la UI
      const tempMessage = {
        id: Date.now(),
        content: newMessage,
        sender: 'admin',
        timestamp: new Date().toISOString(),
        temp: true
      }
      
      setMessages(prev => [...prev, tempMessage])
      setNewMessage('')
      
      // Enviar mensaje al backend
      await api.sendMessageToSession(selectedSession.id, newMessage)
      
      // Recargar mensajes para obtener la respuesta actualizada
      setTimeout(() => {
        loadMessages(selectedSession.id)
      }, 1000)
      
    } catch (error) {
      console.error('Error sending chat message:', error)
      // Remover mensaje temporal en caso de error
      setMessages(prev => prev.filter(msg => !msg.temp))
      alert(`❌ Error enviando mensaje: ${error.message}`)
    } finally {
      setSendingMessage(false)
    }
  }

  // Manejar tecla Enter en el input de chat
  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  }

  // Función para abrir el modal y cargar datos
  const openChatModal = async (session) => {
    setSelectedSession(session)
    setShowChatModal(true)
    await loadMessages(session.id)
    await getBotStatus(session.id)
  }

  // Cerrar modal
  const closeModal = () => {
    setShowChatModal(false)
    setSelectedSession(null)
    setMessages([])
    setNewMessage('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">💬 Sesiones de Chat</h1>
        <div className="text-sm text-gray-500">
          Total de conversaciones: {total}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Buscar Cliente
            </label>
            <div className="flex">
              <input
                type="text"
                placeholder="Nombre, teléfono o cédula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
              >
                🔍
              </button>
            </div>
          </div>

    <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🤖 Chatbot
            </label>
            <select
              value={selectedChatbot}
              onChange={(e) => setSelectedChatbot(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los chatbots</option>
              {chatbots.map((chatbot) => (
                <option key={chatbot.id} value={chatbot.id}>
                  {chatbot.name} ({chatbot.organization?.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedChatbot('');
                setSearchQuery('');
                setCurrentPage(1);
                loadSessions();
              }}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              🔄 Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Sesiones */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chatbot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Mensaje
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mensajes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Búsquedas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actividad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Cargando sesiones...</span>
                    </div>
                  </td>
                </tr>
              ) : (!Array.isArray(sessions) || sessions.length === 0) ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      No hay sesiones
                    </h3>
                    <p className="text-gray-500">
                      {searchQuery || selectedChatbot 
                        ? 'No se encontraron sesiones con los filtros aplicados'
                        : 'Aún no hay conversaciones registradas'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                Array.isArray(sessions) && sessions.map((session) => {
                  const botStatus = botStatuses[session.id] || { isPaused: false, loading: false }
                  
                  return (
                    <tr key={session.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.phone_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.client_pushname || session.client_name || 'Cliente Anónimo'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          session.status === 'active' ? 'bg-green-100 text-green-800' :
                          session.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          session.status === 'human_intervention' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {session.status === 'active' ? 'Activa' :
                           session.status === 'inactive' ? 'Inactiva' :
                           session.status === 'human_intervention' ? 'Intervención' :
                           session.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.message_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.last_activity ? new Date(session.last_activity).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openChatModal(session)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            💬 Ver Chat
                          </button>
                          
                          {/* Botón de pausar/reanudar bot */}
                          <button
                            onClick={() => botStatus.isPaused ? resumeBot(session.id) : pauseBot(session.id)}
                            disabled={botStatus.loading}
                            className={`px-2 py-1 text-xs rounded ${
                              botStatus.isPaused 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            } ${botStatus.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {botStatus.loading ? '⏳' : (botStatus.isPaused ? '▶️ Reanudar' : '⏸️ Pausar')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!loading && Array.isArray(sessions) && sessions.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Mostrando {showingStart} a {showingEnd} de {total} sesiones
            </div>
            <div className="flex space-x-2">
              <button
                onClick={previousPage}
                disabled={currentPage === 1}
                className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${
                  currentPage === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                ◀ Anterior
              </button>
              <span className="px-3 py-2 text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${
                  currentPage === totalPages
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                ▶ Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Chat Mejorado */}
      {showChatModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
            {/* Header del Modal */}
            <div className="p-6 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    💬 Chat con {selectedSession.client_pushname || selectedSession.client_name || 'Cliente Anónimo'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    📱 {selectedSession.phone_number} | 
                    {botStatuses[selectedSession.id]?.isPaused ? 
                      ' 🛑 Bot Pausado' : ' 🤖 Bot Activo'
                    }
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Controles de Intervención Humana */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const currentStatus = botStatuses[selectedSession.id]
                    if (currentStatus?.isPaused) {
                      resumeBot(selectedSession.id)
                    } else {
                      pauseBot(selectedSession.id)
                    }
                  }}
                  disabled={botStatuses[selectedSession.id]?.loading}
                  className={`px-3 py-1 text-sm rounded ${
                    botStatuses[selectedSession.id]?.isPaused
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-yellow-500 text-white hover:bg-yellow-600'
                  } ${botStatuses[selectedSession.id]?.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {botStatuses[selectedSession.id]?.loading ? '⏳ Procesando...' :
                   botStatuses[selectedSession.id]?.isPaused ? '▶️ Reanudar Bot' : '⏸️ Pausar Bot'}
                </button>
                
                <button
                  onClick={() => loadMessages(selectedSession.id)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  🔄 Actualizar
                </button>
              </div>
            </div>

            {/* Área de Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              <div className="space-y-3 max-h-full">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    📝 No hay mensajes en esta conversación
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={`flex ${
                        message.sender === 'user' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender === 'user'
                            ? 'bg-gray-200 text-gray-800'
                            : message.sender === 'admin'
                            ? 'bg-blue-500 text-white'
                            : 'bg-green-500 text-white'
                        } ${message.temp ? 'opacity-70' : ''}`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === 'user' ? 'text-gray-500' : 'text-gray-200'
                        }`}>
                          {message.sender === 'user' ? '👤 Usuario' : 
                           message.sender === 'admin' ? '👨‍💼 Admin' : '🤖 Bot'} • {' '}
                          {message.created_at ? 
                            new Date(message.created_at).toLocaleTimeString() :
                            message.timestamp ? 
                            new Date(message.timestamp).toLocaleTimeString() :
                            'Ahora'
                          }
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Área de Mensaje Manual (Solo cuando el bot está pausado) */}
            {botStatuses[selectedSession.id]?.isPaused && (
              <div className="p-4 bg-yellow-50 border-t border-yellow-200">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    👨‍💼 Mensaje de Operador (Bot Pausado)
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      placeholder="Nombre del operador"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escribe tu mensaje como operador..."
                      rows="2"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => sendManualMessage(selectedSession.id)}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {sendingMessage ? '📤' : '📨 Enviar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Área de Escritura Principal */}
            <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleChatKeyPress}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {sendingMessage ? '📤' : '📨 Enviar'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Presiona Enter para enviar • Shift+Enter para nueva línea
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enviar Mensaje */}
      {showSendMessageModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                📱 Enviar Mensaje
              </h3>
              <p className="text-sm text-gray-500">
                A: {selectedSession.client_pushname || selectedSession.client_name || 'Cliente Anónimo'} ({selectedSession.phone_number})
              </p>
            </div>

            {/* Contenido del Modal */}
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensaje
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Footer del Modal */}
            <div className="px-6 py-4 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => setShowSendMessageModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingMessage ? '📤 Enviando...' : '📤 Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions; 