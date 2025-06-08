import React, { useState, useEffect } from 'react';
import api from '../services/api';

const RAGManager = ({ chatbotId, onRAGUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [stats, setStats] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [processingDocument, setProcessingDocument] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testingQuery, setTestingQuery] = useState(false);

  // Form states
  const [fileForm, setFileForm] = useState({
    file: null,
    title: '',
    category: '',
    tags: ''
  });

  const [manualForm, setManualForm] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    documentType: 'manual'
  });

  // Load knowledge bases and stats
  const loadRAGData = async () => {
    if (!chatbotId) return;
    
    setLoading(true);
    try {
      // Load knowledge bases
      console.log('Loading RAG data for chatbot:', chatbotId);
      const kbResponse = await api.getRAGKnowledgeBases(chatbotId);
      console.log('KB Response:', kbResponse);
      
      if (kbResponse && kbResponse.success) {
        setKnowledgeBases(kbResponse.data || []);
      } else {
        setKnowledgeBases([]);
      }

      // Load stats (optional, don't fail if not available)
      try {
        const statsResponse = await api.getRAGStats(chatbotId);
        if (statsResponse && statsResponse.success) {
          setStats(statsResponse.data);
        } else {
          setStats({ totalKnowledgeBases: kbResponse.data?.length || 0, totalChunks: 0, totalTokens: 0 });
        }
      } catch (statsError) {
        console.log('Stats not available, using fallback');
        setStats({ totalKnowledgeBases: kbResponse.data?.length || 0, totalChunks: 0, totalTokens: 0 });
      }
    } catch (error) {
      console.error('Error loading RAG data:', error);
      showNotification('error', 'Error', 'No se pudieron cargar los datos RAG');
      setKnowledgeBases([]);
      setStats({ totalKnowledgeBases: 0, totalChunks: 0, totalTokens: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRAGData();
  }, [chatbotId]);

  // Upload file
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!fileForm.file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', fileForm.file);
      formData.append('title', fileForm.title || fileForm.file.name);
      formData.append('category', fileForm.category);
      formData.append('tags', fileForm.tags);

      const response = await api.uploadRAGDocument(chatbotId, formData);

      if (response.data.success) {
        showNotification('success', 'Archivo subido', 'El documento se procesó exitosamente');
        setFileForm({ file: null, title: '', category: '', tags: '' });
        setShowUpload(false);
        loadRAGData();
        if (onRAGUpdate) onRAGUpdate();
      } else {
        showNotification('error', 'Error', response.data.message);
      }
    } catch (error) {
      showNotification('error', 'Error', error.response?.data?.message || 'Error subiendo archivo');
    } finally {
      setUploadingFile(false);
    }
  };

  // Add manual document
  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!manualForm.title || !manualForm.content) return;

    setProcessingDocument(true);
    try {
      const response = await api.processRAGDocument({
        chatbotId,
        title: manualForm.title,
        content: manualForm.content,
        documentType: manualForm.documentType,
        category: manualForm.category,
        tags: manualForm.tags ? manualForm.tags.split(',').map(tag => tag.trim()) : [],
        sourceUrl: 'manual://user-input',
        metadata: {
          addedBy: 'user',
          addedAt: new Date().toISOString()
        }
      });

      if (response.data.success) {
        showNotification('success', 'Documento procesado', 'El contenido se agregó exitosamente');
        setManualForm({ title: '', content: '', category: '', tags: '', documentType: 'manual' });
        setShowManualAdd(false);
        loadRAGData();
        if (onRAGUpdate) onRAGUpdate();
      } else {
        showNotification('error', 'Error', response.data.message);
      }
    } catch (error) {
      showNotification('error', 'Error', error.response?.data?.message || 'Error procesando documento');
    } finally {
      setProcessingDocument(false);
    }
  };

  // Test query
  const handleTestQuery = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setTestingQuery(true);
    try {
      const response = await api.queryRAG({
        query: testQuery,
        chatbotId,
        maxResults: 3,
        similarityThreshold: 0.1
      });

      if (response.success) {
        setTestResult(response.data);
      } else {
        setTestResult({
          answer: 'Error en la consulta',
          sources: [],
          confidence: 0,
          error: response.message
        });
      }
    } catch (error) {
      setTestResult({
        answer: 'Error de conexión',
        sources: [],
        confidence: 0,
        error: error.response?.data?.message || error.message
      });
    } finally {
      setTestingQuery(false);
    }
  };

  // Delete knowledge base
  const handleDelete = async (kbId, title) => {
    if (!window.confirm(`¿Eliminar la base de conocimiento "${title}"?`)) return;

    try {
      await api.deleteRAGKnowledgeBase(kbId);
      showNotification('success', 'Eliminado', 'Base de conocimiento eliminada');
      loadRAGData();
      if (onRAGUpdate) onRAGUpdate();
    } catch (error) {
      showNotification('error', 'Error', error.response?.data?.message || 'Error eliminando');
    }
  };

  // Simple notification (you can replace with your notification system)
  const showNotification = (type, title, message) => {
    // Implement your notification system here
    console.log(`${type.toUpperCase()}: ${title} - ${message}`);
    alert(`${title}: ${message}`);
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
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-purple-800">🧠 Base de Conocimiento RAG</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowUpload(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              📄 Subir Archivo
            </button>
            <button
              onClick={() => setShowManualAdd(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              ✏️ Agregar Manual
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg">
              <p className="text-sm text-gray-600">Knowledge Bases</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalKnowledgeBases || 0}</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="text-sm text-gray-600">Chunks</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalChunks || 0}</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="text-sm text-gray-600">Tokens</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalTokens || 0}</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="text-sm text-gray-600">Estado</p>
              <p className="text-sm font-bold text-green-600">
                {stats.totalChunks > 0 ? '✅ Activo' : '⚠️ Sin datos'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Knowledge Bases List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800">📚 Documentos en la Base de Conocimiento</h4>
        </div>
        
        {loading ? (
          <div className="p-6 text-center text-gray-500">
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Cargando...
          </div>
        ) : knowledgeBases.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <i className="fas fa-book-open text-3xl mb-3"></i>
            <p>No hay documentos en la base de conocimiento</p>
            <p className="text-sm">Agrega contenido para que el chatbot pueda responder preguntas específicas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {knowledgeBases.map((kb) => (
              <div key={kb.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{kb.title}</h5>
                    <p className="text-sm text-gray-600 mt-1">{kb.description}</p>
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
                    {kb.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {JSON.parse(kb.tags || '[]').map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(kb.id, kb.title)}
                    className="ml-4 text-red-500 hover:text-red-700 transition-colors"
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
          <h4 className="text-lg font-semibold text-gray-800">🔍 Probar Consultas RAG</h4>
        </div>
        <div className="p-6">
          <form onSubmit={handleTestQuery} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pregunta de prueba
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="¿Cuáles son los horarios de atención?"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!testQuery.trim() || testingQuery}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                >
                  {testingQuery ? 'Buscando...' : 'Probar'}
                </button>
              </div>
            </div>
          </form>

          {testResult && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-gray-800 mb-2">Resultado:</h5>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Respuesta:</p>
                  <p className="text-gray-800 bg-white p-3 rounded border">
                    {testResult.answer}
                  </p>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>📊 Confianza: {(testResult.confidence * 100).toFixed(1)}%</span>
                  <span>📚 Fuentes: {testResult.sources.length}</span>
                </div>
                {testResult.sources.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Fuentes utilizadas:</p>
                    <div className="space-y-2">
                      {testResult.sources.map((source, i) => (
                        <div key={i} className="bg-white p-3 rounded border text-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium">{source.title}</span>
                            <span className="text-purple-600">
                              {(source.similarity * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-gray-600">{source.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">📄 Subir Documento</h3>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Archivo *
                </label>
                <input
                  type="file"
                  onChange={(e) => setFileForm({...fileForm, file: e.target.files[0]})}
                  accept=".txt,.md,.json,.html,.pdf,.doc,.docx"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título (opcional)
                </label>
                <input
                  type="text"
                  value={fileForm.title}
                  onChange={(e) => setFileForm({...fileForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <input
                  type="text"
                  value={fileForm.category}
                  onChange={(e) => setFileForm({...fileForm, category: e.target.value})}
                  placeholder="productos, politicas, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (separados por comas)
                </label>
                <input
                  type="text"
                  value={fileForm.tags}
                  onChange={(e) => setFileForm({...fileForm, tags: e.target.value})}
                  placeholder="horarios, precios, delivery"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!fileForm.file || uploadingFile}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {uploadingFile ? 'Subiendo...' : 'Subir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {showManualAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">✏️ Agregar Contenido Manual</h3>
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({...manualForm, title: e.target.value})}
                  placeholder="Manual de usuario, Políticas de empresa, etc."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenido *
                </label>
                <textarea
                  value={manualForm.content}
                  onChange={(e) => setManualForm({...manualForm, content: e.target.value})}
                  rows="8"
                  placeholder="Escribe aquí la información que quieres que el chatbot conozca..."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={manualForm.category}
                    onChange={(e) => setManualForm({...manualForm, category: e.target.value})}
                    placeholder="manual, faq, politicas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (separados por comas)
                  </label>
                  <input
                    type="text"
                    value={manualForm.tags}
                    onChange={(e) => setManualForm({...manualForm, tags: e.target.value})}
                    placeholder="importante, usuario, soporte"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowManualAdd(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!manualForm.title || !manualForm.content || processingDocument}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {processingDocument ? 'Procesando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGManager; 