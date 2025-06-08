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

  const handleViewChat = (session) => {
    setSelectedSession(session);
    setShowChatModal(true);
    loadMessages(session.id);
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
                Array.isArray(sessions) && sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {session.clientName ? session.clientName.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {session.clientName || 'Cliente Anónimo'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {session.phoneNumber}
                          </div>
                          {session.clientId && (
                            <div className="text-xs text-gray-400">
                              ID: {session.clientId}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{session.chatbotName}</div>
                      <div className="text-xs text-gray-500">{session.organizationName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(session.status)}`}>
                        {session.status === 'active' && '🟢 Activo'}
                        {session.status === 'idle' && '🟡 Inactivo'}
                        {session.status === 'ended' && '⚫ Finalizado'}
                        {session.status === 'blocked' && '🔴 Bloqueado'}
                        {session.status === 'inactive' && '⚪ Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {session.lastMessage || 'Sin mensajes'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(session.lastMessageAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {session.messageCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-lg font-bold text-green-600">
                        {session.searchCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(session.createdAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Duración: {session.duration || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-y-1">
                      <button 
                        onClick={() => handleViewChat(session)}
                        className="w-full bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs hover:bg-blue-100 transition-colors"
                      >
                        👀 Ver Chat
                      </button>
                      <button 
                        onClick={() => handleSendMessage(session)}
                        className="w-full bg-green-50 text-green-600 px-3 py-1 rounded text-xs hover:bg-green-100 transition-colors"
                      >
                        📱 Enviar Mensaje
                      </button>
                    </td>
                  </tr>
                ))
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

      {/* Modal Ver Chat */}
      {showChatModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-96 flex flex-col">
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  💬 Conversación con {selectedSession.clientName || 'Cliente Anónimo'}
                </h3>
                <p className="text-sm text-gray-500">{selectedSession.phoneNumber}</p>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Cargando mensajes...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">💭</div>
                  <p className="text-gray-500">No hay mensajes en esta conversación</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatDate(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowChatModal(false)}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cerrar
              </button>
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
                A: {selectedSession.clientName || 'Cliente Anónimo'} ({selectedSession.phoneNumber})
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