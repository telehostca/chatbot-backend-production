import React, { useState, useEffect } from 'react';
import api from '../services/api';

const SimpleRAGManager = ({ chatbotId, onRAGUpdate }) => {
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

  // Load data when chatbotId changes
  useEffect(() => {
    if (chatbotId) {
      loadRAGData();
    }
  }, [chatbotId]);

  const loadRAGData = async () => {
    if (!chatbotId) return;
    
    setLoading(true);
    try {
      // Load knowledge bases
      console.log('Loading knowledge bases for chatbot:', chatbotId);
      const kbResponse = await api.getRAGKnowledgeBases(chatbotId);
      console.log('KB Response:', kbResponse);
      
      if (kbResponse && kbResponse.success) {
        setKnowledgeBases(kbResponse.data || []);
      }

      // Load stats
      try {
        const statsResponse = await api.getRAGStats(chatbotId);
        console.log('Stats Response:', statsResponse);
        if (statsResponse && statsResponse.success) {
          setStats(statsResponse.data);
        }
      } catch (statsError) {
        console.log('Stats not available:', statsError.message);
        setStats({ totalKnowledgeBases: kbResponse.data?.length || 0, totalChunks: 0, totalTokens: 0 });
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

    setLoading(true);
    try {
      const response = await fetch('/api/rag/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatbotId,
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
        alert('Documento agregado exitosamente');
        setAddForm({ title: '', content: '' });
        setShowAddModal(false);
        loadRAGData();
        if (onRAGUpdate) onRAGUpdate();
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      alert('Error agregando documento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestQuery = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setLoading(true);
    try {
      const response = await api.queryRAG({
        query: testQuery,
        chatbotId,
        maxResults: 3,
        similarityThreshold: 0.1
      });

      if (response && response.success) {
        setTestResult(response.data);
      } else {
        setTestResult({
          answer: 'Error en la consulta',
          sources: [],
          confidence: 0,
          error: response?.message || 'Error desconocido'
        });
      }
    } catch (error) {
      setTestResult({
        answer: 'Error de conexión',
        sources: [],
        confidence: 0,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (kbId, title) => {
    if (!confirm(`¿Eliminar la base de conocimiento "${title}"?`)) return;

    setLoading(true);
    try {
      await api.deleteRAGKnowledgeBase(kbId);
      alert('Base de conocimiento eliminada');
      loadRAGData();
      if (onRAGUpdate) onRAGUpdate();
    } catch (error) {
      alert('Error eliminando: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!chatbotId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <i className="fas fa-robot text-4xl mb-4"></i>
        <p>Selecciona un chatbot para gestionar su base de conocimiento</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-purple-800">🧠 Base de Conocimiento RAG</h3>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            ➕ Agregar Contenido
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Knowledge Bases</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalKnowledgeBases || knowledgeBases.length}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Chunks</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalChunks || 0}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Tokens</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalTokens || 0}</p>
            </div>
          </div>
        )}
      </div>

      {/* Knowledge Bases List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800">📚 Documentos</h4>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <i className="fas fa-spinner fa-spin text-blue-600 mr-2"></i>
            Cargando...
          </div>
        ) : knowledgeBases.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <i className="fas fa-book-open text-3xl mb-3"></i>
            <p>No hay documentos en la base de conocimiento</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Agregar el primer documento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {knowledgeBases.map((kb) => (
              <div key={kb.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{kb.title}</h5>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>📊 {kb.totalChunks} chunks</span>
                      <span>🎯 {kb.totalTokens} tokens</span>
                      <span>📂 {kb.category}</span>
                      <span className={`px-2 py-1 rounded ${
                        kb.status === 'processed' ? 'bg-green-100 text-green-800' :
                        kb.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {kb.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(kb.id, kb.title)}
                    className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                    disabled={loading}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Query Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800">🔍 Probar Consultas</h4>
        </div>
        <div className="p-6">
          <form onSubmit={handleTestQuery} className="space-y-4">
            <div>
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Escribe tu pregunta..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={!testQuery.trim() || loading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Consultando...' : '🚀 Probar'}
            </button>
          </form>

          {testResult && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-gray-800 mb-2">Resultado:</h5>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-800 bg-white p-3 rounded border">
                    {testResult.answer}
                  </p>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>📊 Confianza: {(testResult.confidence * 100).toFixed(1)}%</span>
                  <span>📚 Fuentes: {testResult.sources?.length || 0}</span>
                </div>
                {testResult.error && (
                  <div className="text-red-600 text-sm">
                    ❌ Error: {testResult.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold mb-4">➕ Agregar Contenido</h3>
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
                  placeholder="Contenido del documento..."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!addForm.title || !addForm.content || loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
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

export default SimpleRAGManager; 