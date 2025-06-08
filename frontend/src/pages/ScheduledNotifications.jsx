import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const ScheduledNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cronConfig, setCronConfig] = useState({ enabled: true });
  
  // Estados para el modal de crear notificación
  const [newNotification, setNewNotification] = useState({
    title: '',
    content: '',
    category: '',
    chatbotId: '',
    cronEnabled: false,
    cronExpression: '0 9 * * *', // 9:00 AM diario por defecto
    audience: 'all', // all, active_users, recent_buyers, new_users
    
    isActive: true
  });

  // Estados para estadísticas
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    executed: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadNotifications(),
        loadChatbots(),
        loadCronConfig()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await api.getNotificationTemplates();
      setNotifications(response.data || []);
      updateStats(response.data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadChatbots = async () => {
    try {
      const response = await api.getChatbots();
      setChatbots(response.data || []);
    } catch (error) {
      console.error('Error loading chatbots:', error);
    }
  };

  const loadCronConfig = async () => {
    try {
      const response = await api.getCronConfig();
      setCronConfig(response.data || { enabled: true });
    } catch (error) {
      console.error('Error loading cron config:', error);
    }
  };

  const updateStats = (notificationList) => {
    const total = notificationList.length;
    const active = notificationList.filter(n => n.isActive).length;
    const scheduled = notificationList.filter(n => n.cronEnabled && n.isActive).length;
    const executed = notificationList.reduce((sum, n) => sum + (n.sentCount || 0), 0);
    
    setStats({ total, active, scheduled, executed });
  };

  const handleCreateNotification = async () => {
    try {
      setLoading(true);
      
      // Calcular próxima ejecución
      const nextExecution = calculateNextExecution(newNotification.cronExpression);
      
      // Limpiar datos para enviar solo los campos que espera el backend
      const notificationData = {
        title: newNotification.title,
        content: newNotification.content,
        category: newNotification.category,
        audience: newNotification.audience,
        chatbotId: newNotification.chatbotId || undefined,
        isActive: newNotification.isActive,
        cronEnabled: newNotification.cronEnabled,
        cronExpression: newNotification.cronEnabled ? newNotification.cronExpression : undefined
      };

      await api.createNotificationTemplate(notificationData);
      
      await loadNotifications();
      setShowCreateModal(false);
      resetForm();
      
      alert('✅ Notificación programada creada correctamente');
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('❌ Error creando notificación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotification = async (id, isActive) => {
    try {
      await api.updateNotificationTemplate(id, { isActive: !isActive });
      await loadNotifications();
    } catch (error) {
      console.error('Error toggling notification:', error);
    }
  };

  const deleteNotification = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta notificación?')) return;
    
    try {
      await api.deleteNotificationTemplate(id);
      await loadNotifications();
      alert('✅ Notificación eliminada');
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('❌ Error eliminando notificación');
    }
  };

  const resetForm = () => {
    setNewNotification({
      title: '',
      content: '',
      category: '',
      chatbotId: '',
      cronEnabled: false,
      cronExpression: '0 9 * * *',
      audience: 'all',
      
      isActive: true
    });
  };

  const calculateNextExecution = (cronExpression) => {
    // Simulación simple para demo - en producción usar librería como node-cron
    const now = new Date();
    const [minute, hour] = cronExpression.split(' ');
    
    if (minute === '0' && !isNaN(hour)) {
      const next = new Date(now);
      next.setHours(parseInt(hour), 0, 0, 0);
      
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next.toISOString();
    }
    
    // Por defecto, añadir 1 hora
    const next = new Date(now.getTime() + 60 * 60 * 1000);
    return next.toISOString();
  };

  const formatCronDescription = (cronExpression) => {
    if (!cronExpression) return 'No programado';
    
    const parts = cronExpression.split(' ');
    if (parts.length >= 2) {
      const minute = parts[0];
      const hour = parts[1];
      
      if (minute === '0' && hour !== '*') {
        return `Cada día a las ${hour}:00`;
      } else if (hour !== '*' && minute !== '*') {
        return `Cada día a las ${hour}:${minute}`;
      }
    }
    
    return cronExpression;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-ES');
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'discount': '💰',
      'promotion': '🎉',
      'welcome': '👋',
      'reminder': '⏰',
      'followup': '📞'
    };
    return icons[category] || '📢';
  };

  const getCategoryName = (category) => {
    const names = {
      'discount': 'Descuentos',
      'promotion': 'Promociones',
      'welcome': 'Bienvenida',
      'reminder': 'Recordatorios',
      'followup': 'Seguimiento'
    };
    return names[category] || category;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⏰ Notificaciones Programadas</h1>
          <p className="text-gray-600">Sistema automático de mensajes por cron</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          ➕ Nueva Notificación
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Activas</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <span className="text-2xl">⏰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Programadas</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.scheduled}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <span className="text-2xl">📤</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Enviadas</p>
              <p className="text-2xl font-bold text-purple-600">{stats.executed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estado del Cron */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${cronConfig.enabled ? 'bg-green-500' : 'bg-red-500'} mr-3`}></div>
            <span className="font-medium">
              Sistema de Cron: {cronConfig.enabled ? '🟢 ACTIVO' : '🔴 INACTIVO'}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            Verificación cada 5 minutos
          </span>
        </div>
      </div>

      {/* Lista de Notificaciones */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">📋 Plantillas de Notificación</h3>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando notificaciones...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">⏰</div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No hay notificaciones programadas</h3>
            <p className="text-gray-500">Crea tu primera notificación automática</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">
                        {getCategoryIcon(notification.category)}
                      </span>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {notification.title}
                      </h4>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                        notification.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {notification.isActive ? '✅ Activa' : '⏸️ Pausada'}
                      </span>
                      {notification.cronEnabled && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          ⏰ Programada
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-700 mb-3">{notification.content}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <strong>Categoría:</strong> {getCategoryName(notification.category)}
                      </div>
                      <div>
                        <strong>Chatbot:</strong> {notification.chatbotName || 'Todos'}
                      </div>
                      <div>
                        <strong>Enviadas:</strong> {notification.sentCount || 0} veces
                      </div>
                    </div>
                    
                    {notification.cronEnabled && (
                      <div className="mt-3 p-3 bg-blue-50 rounded">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>📅 Programación:</strong><br />
                            {formatCronDescription(notification.cronExpression)}
                          </div>
                          <div>
                            <strong>⏰ Próxima ejecución:</strong><br />
                            {formatDate(notification.nextExecution)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-6 flex flex-col space-y-2">
                    <button
                      onClick={() => toggleNotification(notification.id, notification.isActive)}
                      className={`px-3 py-1 text-xs rounded ${
                        notification.isActive
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {notification.isActive ? '⏸️ Pausar' : '▶️ Activar'}
                    </button>
                    
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
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

      {/* Modal Crear Notificación */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-96 overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                ➕ Nueva Notificación Programada
              </h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                    placeholder="Ej: Descuento del 20%"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                  <select
                    value={newNotification.category}
                    onChange={(e) => setNewNotification({...newNotification, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="discount">💰 Descuentos</option>
                    <option value="promotion">🎉 Promociones</option>
                    <option value="welcome">👋 Bienvenida</option>
                    <option value="reminder">⏰ Recordatorios</option>
                    <option value="followup">📞 Seguimiento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label>
                <textarea
                  value={newNotification.content}
                  onChange={(e) => setNewNotification({...newNotification, content: e.target.value})}
                  placeholder="¡Hola! Te tenemos un descuento especial del 20% en todos nuestros productos..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chatbot</label>
                <select
                  value={newNotification.chatbotId}
                  onChange={(e) => setNewNotification({...newNotification, chatbotId: e.target.value})}
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

              {/* Programación */}
              <div className="border-t pt-4">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    checked={newNotification.cronEnabled}
                    onChange={(e) => setNewNotification({...newNotification, cronEnabled: e.target.checked})}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">⏰ Programar envío automático</label>
                </div>

                {newNotification.cronEnabled && (
                  <div className="space-y-4 bg-blue-50 p-4 rounded">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Programación (Cron)</label>
                      <select
                        value={newNotification.cronExpression}
                        onChange={(e) => setNewNotification({...newNotification, cronExpression: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="0 9 * * *">Cada día a las 9:00 AM</option>
                        <option value="0 12 * * *">Cada día a las 12:00 PM</option>
                        <option value="0 18 * * *">Cada día a las 6:00 PM</option>
                        <option value="0 9 * * 1">Cada lunes a las 9:00 AM</option>
                        <option value="0 9 1 * *">Cada 1ro del mes a las 9:00 AM</option>
                        <option value="*/30 * * * *">Cada 30 minutos (prueba)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        📅 Próxima ejecución: {formatDate(calculateNextExecution(newNotification.cronExpression))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNotification}
                disabled={!newNotification.title || !newNotification.content || !newNotification.category}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✅ Crear Notificación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledNotifications; 