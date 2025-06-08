import React, { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 40);
}

const Organizations = () => {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    planType: 'trial',
    maxChatbots: 1
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editOrg, setEditOrg] = useState(null)

  useEffect(() => {
    api.getOrganizations()
      .then(res => setOrganizations(res.data || []))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === 'name' && (!form.slug || form.slug === slugify(form.name))) {
      setForm({ ...form, name: value, slug: slugify(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.name) return setError('El nombre es obligatorio')
    setSubmitting(true)
    try {
      const org = await api.createOrganization(form)
      setOrganizations([org, ...organizations])
      setShowCreate(false)
      setForm({ name: '', description: '', planType: 'trial', maxChatbots: 1 })
    } catch (err) {
      setError(err.message || 'Error al crear organización')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = org => {
    setEditOrg(org)
    setForm({
      name: org.name || '',
      slug: org.slug || '',
      description: org.description || '',
      contactEmail: org.contactEmail || '',
      contactPhone: org.contactPhone || '',
      planType: org.planType || 'trial',
      maxChatbots: org.maxChatbots || 1
    })
    setShowEdit(true)
    setError('')
  }

  const handleEditSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.name) return setError('El nombre es obligatorio')
    setSubmitting(true)
    try {
      const updated = await api.updateOrganization(editOrg.id, form)
      setOrganizations(organizations.map(o => o.id === editOrg.id ? updated : o))
      setShowEdit(false)
      setEditOrg(null)
    } catch (err) {
      setError(err.message || 'Error al actualizar organización')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (org) => {
    // Confirmación de seguridad
    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar la organización "${org.name}"?\n\n` +
      `⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER ⚠️\n\n` +
      `Se eliminarán:\n` +
      `• La organización\n` +
      `• Todos sus chatbots (${org.chatbots?.length || 0})\n` +
      `• Todas las configuraciones asociadas\n\n` +
      `Escribe "ELIMINAR" para confirmar:`
    );

    if (!confirmDelete) return;

    // Doble confirmación con prompt
    const confirmation = window.prompt(
      `Para confirmar la eliminación de "${org.name}", escribe exactamente: ELIMINAR`
    );

    if (confirmation !== 'ELIMINAR') {
      alert('Eliminación cancelada. No se escribió "ELIMINAR" correctamente.');
      return;
    }

    setSubmitting(true);
    try {
      await api.deleteOrganization(org.id);
      setOrganizations(organizations.filter(o => o.id !== org.id));
      alert(`✅ Organización "${org.name}" eliminada exitosamente`);
    } catch (err) {
      alert(`❌ Error al eliminar organización: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🤖 Gestión de Organizaciones</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <i className="fas fa-plus mr-2"></i>Nueva Organización
        </button>
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva Organización">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Crear Nueva Organización</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="Nombre de la organización" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input name="slug" value={form.slug} onChange={handleChange} required pattern="^[a-z0-9\-]+$" maxLength={40} placeholder="slug-org" className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-xs text-gray-400">Solo minúsculas, números y guiones. Máx 40 caracteres.</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Descripción de la organización" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto *</label>
              <input name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} required placeholder="admin@empresa.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Contacto</label>
              <input name="contactPhone" value={form.contactPhone} onChange={handleChange} placeholder="+1234567890" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Plan *</label>
              <select name="planType" value={form.planType} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar plan...</option>
                <option value="trial">Trial (Prueba)</option>
                <option value="basic">Básico</option>
                <option value="pro">Profesional</option>
                <option value="enterprise">Empresarial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de Chatbots</label>
              <input name="maxChatbots" type="number" min="1" max="100" value={form.maxChatbots} onChange={handleChange} placeholder="5" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
              <i className="fas fa-plus mr-2"></i>Crear Organización
            </button>
          </div>
        </form>
      </Modal>
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar Organización">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Editar Organización</h3>
            <button type="button" onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="Nombre de la organización" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input name="slug" value={form.slug} onChange={handleChange} required pattern="^[a-z0-9\-]+$" maxLength={40} placeholder="slug-org" className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-xs text-gray-400">Solo minúsculas, números y guiones. Máx 40 caracteres.</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Descripción de la organización" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto *</label>
              <input name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} required placeholder="admin@empresa.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Contacto</label>
              <input name="contactPhone" value={form.contactPhone} onChange={handleChange} placeholder="+1234567890" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Plan *</label>
              <select name="planType" value={form.planType} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar plan...</option>
                <option value="trial">Trial (Prueba)</option>
                <option value="basic">Básico</option>
                <option value="pro">Profesional</option>
                <option value="enterprise">Empresarial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de Chatbots</label>
              <input name="maxChatbots" type="number" min="1" max="100" value={form.maxChatbots} onChange={handleChange} placeholder="5" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
              <i className="fas fa-save mr-2"></i>Guardar Cambios
            </button>
          </div>
        </form>
      </Modal>
      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map(org => (
            <div key={org.id} className="bg-white rounded-lg shadow-md p-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{org.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${org.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{org.isActive ? 'Activa' : 'Inactiva'}</span>
              </div>
              <p className="text-gray-600 text-sm mb-3">{org.description || 'Sin descripción'}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan:</span>
                  <span className="font-medium capitalize">{org.planType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Chatbots:</span>
                  <span className="font-medium">{(org.chatbots?.length || 0) + '/' + org.maxChatbots}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slug:</span>
                  <code className="bg-gray-100 px-1 rounded text-xs">{org.slug}</code>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => openEditModal(org)}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded text-sm hover:bg-blue-100 transition-colors"
                >
                  <i className="fas fa-edit mr-1"></i>Editar
                </button>
                <button
                  // onClick={() => selectOrgForChatbot(org)}
                  className="flex-1 bg-green-50 text-green-600 py-2 px-3 rounded text-sm hover:bg-green-100 transition-colors"
                >
                  <i className="fas fa-robot mr-1"></i>Chatbot
                </button>
                <button
                  onClick={() => handleDelete(org)}
                  className="flex-1 bg-red-50 text-red-600 py-2 px-3 rounded text-sm hover:bg-red-100 transition-colors"
                >
                  <i className="fas fa-trash mr-1"></i>Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Organizations 