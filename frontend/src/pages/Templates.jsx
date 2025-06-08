import React, { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'

const Templates = () => {
  const [chatbots, setChatbots] = useState([])
  const [selectedChatbot, setSelectedChatbot] = useState('')
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const [form, setForm] = useState({ 
    title: '', 
    content: '', 
    category: 'welcome',
    cronEnabled: false,
    scheduleTime: '09:00',
    cronExpression: '',
    variables: {},
    isActive: true
  })
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testingId, setTestingId] = useState(null)

  useEffect(() => {
    loadChatbots()
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [selectedChatbot])

  const loadChatbots = async () => {
    try {
      const response = await api.getChatbots()
      setChatbots(response.data || [])
    } catch (error) {
      console.error('Error loading chatbots:', error)
      setChatbots([])
    }
  }

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await api.getNotificationTemplates(selectedChatbot || null)
      setTemplates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplates([])
      setError('Error cargando plantillas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const generateCronExpression = () => {
    const [hour, minute] = form.scheduleTime.split(':')
    if (form.category === 'promotion') {
      return `${minute || '0'} ${hour || '9'} * * *` // Diario
    }
    return `${minute || '0'} ${hour || '9'} * * 1` // Lunes
  }

  const openCreateModal = () => {
    setForm({ 
      title: '', 
      content: '', 
      category: 'welcome',
      cronEnabled: false,
      scheduleTime: '09:00',
      cronExpression: '',
      variables: {},
      isActive: true
    })
    setShowCreate(true)
    setError('')
  }

  const openEditModal = tpl => {
    setEditId(tpl.id)
    setForm({ 
      title: tpl.title || tpl.name,
      content: tpl.content,
      category: tpl.category || 'welcome',
      cronEnabled: tpl.cronEnabled || false,
      scheduleTime: tpl.scheduleTime || '09:00',
      cronExpression: tpl.cronExpression || '',
      variables: tpl.variables || {},
      isActive: tpl.isActive !== undefined ? tpl.isActive : true
    })
    setShowEdit(true)
    setError('')
  }

  const openTestModal = tpl => {
    setTestingId(tpl.id)
    setTestPhone('')
    setShowTest(true)
  }

  const handleCreate = async e => {
    e.preventDefault()
    setError('')
    if (!form.title) return setError('El título es obligatorio')
    
    setSubmitting(true)
    try {
      const templateData = {
        ...form,
        chatbotId: selectedChatbot,
        cronExpression: form.cronEnabled ? generateCronExpression() : null
      }
      
      await api.createNotificationTemplate(templateData)
      await loadTemplates()
      setShowCreate(false)
    } catch (err) {
      setError(err.message || 'Error al crear plantilla')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async e => {
    e.preventDefault()
    setError('')
    if (!form.title) return setError('El título es obligatorio')
    
    setSubmitting(true)
    try {
      const templateData = {
        ...form,
        cronExpression: form.cronEnabled ? generateCronExpression() : null
      }
      
      await api.updateNotificationTemplate(editId, templateData)
      await loadTemplates()
      setShowEdit(false)
      setEditId(null)
    } catch (err) {
      setError(err.message || 'Error al actualizar plantilla')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTest = async e => {
    e.preventDefault()
    if (!testPhone) return setError('El número de teléfono es obligatorio')
    
    setSubmitting(true)
    try {
      await api.testNotificationTemplate(testingId, testPhone)
      setShowTest(false)
      alert('Mensaje de prueba enviado exitosamente')
    } catch (err) {
      setError(err.message || 'Error al enviar mensaje de prueba')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return
    
    try {
      await api.deleteNotificationTemplate(id)
      await loadTemplates()
    } catch (err) {
      alert('Error al eliminar plantilla: ' + err.message)
    }
  }

  const CategoryBadge = ({ category }) => {
    const colors = {
      welcome: 'bg-blue-100 text-blue-800',
      promotion: 'bg-green-100 text-green-800',
      reminder: 'bg-yellow-100 text-yellow-800',
      followup: 'bg-purple-100 text-purple-800',
      discount: 'bg-red-100 text-red-800'
    }
    
    const icons = {
      welcome: '👋',
      promotion: '🎉',
      reminder: '⏰',
      followup: '📞',
      discount: '💰'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[category] || colors.welcome}`}>
        <span className="mr-1">{icons[category] || '📝'}</span>
        {category}
      </span>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📝 Plantillas de Notificación</h1>
          <p className="text-gray-600 mt-2">Gestión avanzada de plantillas de mensajes programados</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-3 py-2"
            value={selectedChatbot}
            onChange={e => setSelectedChatbot(e.target.value)}
          >
            <option value="">Todos los chatbots</option>
            {chatbots.map(cb => (
              <option key={cb.id} value={cb.id}>{cb.name}</option>
            ))}
          </select>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <i className="fas fa-plus mr-2"></i>Nueva Plantilla
          </button>
        </div>
      </div>

      {/* Modal de Creación */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva Plantilla de Notificación">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Título *</label>
              <input 
                name="title" 
                value={form.title} 
                onChange={handleChange} 
                className="mt-1 w-full border rounded px-3 py-2" 
                required 
                placeholder="Ej: Bienvenida Farmacia"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Categoría</label>
              <select 
                name="category" 
                value={form.category} 
                onChange={handleChange} 
                className="mt-1 w-full border rounded px-3 py-2"
              >
                <option value="welcome">👋 Bienvenida</option>
                <option value="promotion">🎉 Promoción</option>
                <option value="reminder">⏰ Recordatorio</option>
                <option value="followup">📞 Seguimiento</option>
                <option value="discount">💰 Descuento</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Contenido *</label>
            <textarea 
              name="content" 
              value={form.content} 
              onChange={handleChange} 
              className="mt-1 w-full border rounded px-3 py-2" 
              rows={6}
              placeholder="Usa variables como: nombre, fecha, farmacia"
            />
            <small className="text-gray-500">Variables disponibles: nombre, fecha, farmacia, telefono</small>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                name="cronEnabled" 
                checked={form.cronEnabled} 
                onChange={handleChange}
                className="rounded"
              />
              <label className="text-sm font-medium text-gray-700">Programar envío automático</label>
            </div>
            
            {form.cronEnabled && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hora de envío</label>
                  <input 
                    type="time" 
                    name="scheduleTime" 
                    value={form.scheduleTime} 
                    onChange={handleChange}
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="flex items-center">
                  <small className="text-gray-500">
                    Se enviará {form.category === 'promotion' ? 'diariamente' : 'semanalmente'} a las {form.scheduleTime}
                  </small>
                </div>
              </div>
            )}
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}
          
          <div className="flex justify-end space-x-2">
            <button 
              type="button" 
              onClick={() => setShowCreate(false)} 
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edición */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar Plantilla">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Título *</label>
              <input 
                name="title" 
                value={form.title} 
                onChange={handleChange} 
                className="mt-1 w-full border rounded px-3 py-2" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Categoría</label>
              <select 
                name="category" 
                value={form.category} 
                onChange={handleChange} 
                className="mt-1 w-full border rounded px-3 py-2"
              >
                <option value="welcome">👋 Bienvenida</option>
                <option value="promotion">🎉 Promoción</option>
                <option value="reminder">⏰ Recordatorio</option>
                <option value="followup">📞 Seguimiento</option>
                <option value="discount">💰 Descuento</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Contenido *</label>
            <textarea 
              name="content" 
              value={form.content} 
              onChange={handleChange} 
              className="mt-1 w-full border rounded px-3 py-2" 
              rows={6}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                name="cronEnabled" 
                checked={form.cronEnabled} 
                onChange={handleChange}
                className="rounded"
              />
              <label className="text-sm font-medium text-gray-700">Programar envío automático</label>
            </div>
            
            {form.cronEnabled && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700">Hora de envío</label>
                <input 
                  type="time" 
                  name="scheduleTime" 
                  value={form.scheduleTime} 
                  onChange={handleChange}
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </div>
            )}
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}
          
          <div className="flex justify-end space-x-2">
            <button 
              type="button" 
              onClick={() => setShowEdit(false)} 
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Prueba */}
      <Modal open={showTest} onClose={() => setShowTest(false)} title="Enviar Mensaje de Prueba">
        <form onSubmit={handleTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Número de WhatsApp</label>
            <input 
              type="tel" 
              value={testPhone} 
              onChange={e => setTestPhone(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2" 
              placeholder="584245325586"
              required
            />
            <small className="text-gray-500">Incluye código de país (ej: 584245325586)</small>
          </div>
          
          {error && <div className="text-red-500 text-sm">{error}</div>}
          
          <div className="flex justify-end space-x-2">
            <button 
              type="button" 
              onClick={() => setShowTest(false)} 
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Enviar Prueba'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lista de Plantillas */}
      <div className="bg-white rounded-lg shadow p-6 mt-4">
        {loading ? (
          <div className="text-gray-500 text-center py-8">
            <i className="fas fa-spinner fa-spin mr-2"></i>Cargando plantillas...
          </div>
        ) : templates.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            <i className="fas fa-inbox text-4xl mb-4"></i>
            <div>No hay plantillas disponibles</div>
            <div className="text-sm mt-2">
              {selectedChatbot ? 'Crea tu primera plantilla para este chatbot' : 'Selecciona un chatbot para ver sus plantillas'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {templates.map(tpl => (
              <div key={tpl.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">{tpl.title || tpl.name}</h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <CategoryBadge category={tpl.category || 'welcome'} />
                      {tpl.cronEnabled && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          ⏰ Programada
                        </span>
                      )}
                      {!tpl.isActive && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          ⏸️ Inactiva
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => openTestModal(tpl)}
                      className="text-green-600 hover:text-green-800 p-1"
                      title="Enviar prueba"
                    >
                      <i className="fas fa-paper-plane"></i>
                    </button>
                    <button 
                      onClick={() => openEditModal(tpl)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Editar"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(tpl.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Eliminar"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div className="text-gray-600 text-sm whitespace-pre-line bg-gray-50 p-3 rounded">
                  {tpl.content}
                </div>
                {tpl.cronExpression && (
                  <div className="mt-2 text-xs text-purple-600">
                    <i className="fas fa-clock mr-1"></i>
                    Cron: {tpl.cronExpression}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Templates