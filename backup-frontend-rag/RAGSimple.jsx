import React, { useState, useEffect } from 'react';
import api from '../services/api';

const RAGSimple = () => {
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState('');
  const [loading, setLoading] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [stats, setStats] = useState(null);
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    content: ''
  });

  // Load chatbots on mount
  useEffect(() => {
    loadChatbots();
  }, []);

  // Load RAG data when chatbot changes
  useEffect(() => {
    if (selectedChatbot) {
      loadRAGData();
    }
  }, [selectedChatbot]);

  const loadChatbots = async () => {
    try {
      setLoading(true);
      const response = await api.getChatbots();
      console.log('Chatbots loaded:', response);
      
      if (response && response.data) {
        setChatbots(response.data);
        
        // Auto-select first chatbot
        if (response.data.length > 0) {
          setSelectedChatbot(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading chatbots:', error);
      alert('Error cargando chatbots: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRAGData = async () => {
    if (!selectedChatbot) return;
    
    try {
      setLoading(true);
      
      // Load knowledge bases
      const kbResponse = await api.getRAGKnowledgeBases(selectedChatbot);
      console.log('Knowledge bases response:', kbResponse);
      
      if (kbResponse && kbResponse.success) {
        setKnowledgeBases(kbResponse.data || []);
      }

      // Load stats (optional)
      try {
        const statsResponse = await api.getRAGStats(selectedChatbot);
        if (statsResponse && statsResponse.success) {
          setStats(statsResponse.data);
        }
      } catch (statsError) {
        // Stats not critical, continue without them
        setStats({ 
          totalKnowledgeBases: kbResponse.data?.length || 0, 
          totalChunks: 0, 
          totalTokens: 0 
        });
      }
    } catch (error) {
      console.error('Error loading RAG data:', error);
      alert('Error cargando datos RAG: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!addForm.title || !addForm.content) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/rag/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatbotId: selectedChatbot,
          title: addForm.title,
          content: addForm.content,
          documentType: 'manual',
          category: 'user-added',
          tags: ['manual'],
          sourceUrl: 'manual://user-input',
          metadata: {
            addedBy: 'user',
            addedAt: new Date().toISOString()
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Documento agregado exitosamente');
        setAddForm({ title: '', content: '' });
        setShowAddModal(false);
        loadRAGData();
      } else {
        alert('❌ Error: ' + (result.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error adding document:', error);
      alert('❌ Error agregando documento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestQuery = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    try {
      setLoading(true);
      
      const response = await api.queryRAG({
        query: testQuery,
        chatbotId: selectedChatbot,
        maxResults: 3,
        similarityThreshold: 0.1
      });

      if (response && response.success) {
        setTestResult(response.data);
      } else {
        setTestResult({
          answer: 'Error en la consulta: ' + (response?.message || 'Error desconocido'),
          sources: [],
          confidence: 0
        });
      }
    } catch (error) {
      console.error('Error testing query:', error);
      setTestResult({
        answer: 'Error de conexión: ' + error.message,
        sources: [],
        confidence: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (kbId, title) => {
    if (!confirm(`¿Eliminar "${title}"?`)) return;

    try {
      setLoading(true);
      await api.deleteRAGKnowledgeBase(kbId);
      alert('✅ Eliminado exitosamente');
      loadRAGData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('❌ Error eliminando: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">🧠 Sistema RAG</h1>
        <p className="text-purple-100">
          Gestión de Conocimiento Inteligente para Chatbots
        </p>
      </div>

      {/* System Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <i className="fas fa-info-circle text-blue-600"></i>
          <span className="font-medium text-blue-800">Sistema RAG Operativo</span>
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </div>
      </div>

      {/* Chatbot Selector */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          🤖 Seleccionar Chatbot
        </h2>
        
        {loading && chatbots.length === 0 ? (
          <div className="text-center py-4">
            <i className="fas fa-spinner fa-spin text-blue-600 mr-2"></i>
            Cargando chatbots...
          </div>
        ) : chatbots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-robot text-4xl mb-4"></i>
            <p>No hay chatbots disponibles</p>
            <button
              onClick={() => window.location.href = '/chatbots'}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Crear Chatbot
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <select
              value={selectedChatbot}
              onChange={(e) => setSelectedChatbot(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar chatbot...</option>
              {chatbots.map((chatbot) => (
                <option key={chatbot.id} value={chatbot.id}>
                  {chatbot.name} ({chatbot.organization?.name})
                </option>
              ))}
            </select>
            
            {selectedChatbot && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">
                  <strong>Chatbot seleccionado:</strong> {chatbots.find(c => c.id === selectedChatbot)?.name}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RAG Management */}
      {selectedChatbot && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-purple-800">📊 Estadísticas</h3>
              <button
                onClick={() => setShowAddModal(true)}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                ➕ Agregar Documento
              </button>
            </div>

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Documentos</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.totalKnowledgeBases || knowledgeBases.length}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Fragmentos</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalChunks || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Tokens</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalTokens || 0}</p>
                </div>
              </div>
            )}
          </div>

          {/* Knowledge Bases */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h4 className="text-lg font-semibold">📚 Base de Conocimiento</h4>
            </div>
            
            {loading ? (
              <div className="p-6 text-center">
                <i className="fas fa-spinner fa-spin text-blue-600 mr-2"></i>
                Cargando documentos...
              </div>
            ) : knowledgeBases.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <i className="fas fa-book-open text-3xl mb-3"></i>
                <p>No hay documentos en la base de conocimiento</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 text-blue-600 hover:text-blue-800"
                >
                  Agregar el primer documento
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {knowledgeBases.map((kb) => (
                  <div key={kb.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{kb.title}</h5>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>📊 {kb.totalChunks || 0} chunks</span>
                          <span>🎯 {kb.totalTokens || 0} tokens</span>
                          <span>📂 {kb.category || 'Sin categoría'}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            kb.status === 'processed' ? 'bg-green-100 text-green-800' :
                            kb.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {kb.status || 'unknown'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(kb.id, kb.title)}
                        disabled={loading}
                        className="ml-4 text-red-500 hover:text-red-700 disabled:text-gray-400"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test Queries */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h4 className="text-lg font-semibold">🔍 Probar Consultas</h4>
            </div>
            <div className="p-6">
              <form onSubmit={handleTestQuery} className="space-y-4">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Escribe tu pregunta..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!testQuery.trim() || loading}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? 'Consultando...' : '🚀 Probar Consulta'}
                </button>
              </form>

              {testResult && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-800 mb-2">Resultado:</h5>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-800">{testResult.answer}</p>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <span>📊 Confianza: {((testResult.confidence || 0) * 100).toFixed(1)}%</span>
                    <span className="ml-4">📚 Fuentes: {testResult.sources?.length || 0}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold mb-4">➕ Agregar Documento</h3>
            <form onSubmit={handleAddDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) => setAddForm({...addForm, title: e.target.value})}
                  placeholder="Título del documento"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenido *
                </label>
                <textarea
                  value={addForm.content}
                  onChange={(e) => setAddForm({...addForm, content: e.target.value})}
                  rows="8"
                  placeholder="Contenido que quieres que el chatbot conozca..."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={loading}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!addForm.title || !addForm.content || loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGSimple; 