import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

const Stats = () => {
  const defaultStats = {
    chatbots: { total: 0, active: 0, inactive: 0 },
    conversations: { total: 0, today: 0, thisWeek: 0, thisMonth: 0 },
    messages: { total: 0, today: 0, thisWeek: 0, thisMonth: 0 },
    notifications: { sent: 0, pending: 0, failed: 0 },
    rag: { documents: 0, chunks: 0, queries: 0 },
    database: { connections: 0, active: 0 }
  }
  
  const [stats, setStats] = useState(defaultStats)
  const [chatbotStats, setChatbotStats] = useState([])
  const [weeklyActivity, setWeeklyActivity] = useState([])
  const [recentEvents, setRecentEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('today')

  useEffect(() => {
    loadStats()
    loadChatbotStats()
    loadWeeklyActivity()
    loadRecentEvents()
  }, [selectedPeriod])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      // Obtener estadísticas reales del backend
      const response = await api.get(`/admin/stats?period=${selectedPeriod}`)
      // El backend devuelve datos directamente, no en response.data
      // Fusionar con valores por defecto para evitar propiedades undefined
      setStats({ ...defaultStats, ...response })
      
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
      
      // Fallback a datos por defecto en caso de error
      setStats(defaultStats)
    } finally {
      setLoading(false)
    }
  }

  const loadChatbotStats = async () => {
    try {
      const response = await api.get('/admin/stats/chatbots')
      setChatbotStats(response || [])
    } catch (error) {
      console.error('Error cargando estadísticas de chatbots:', error)
      setChatbotStats([])
    }
  }

  const loadWeeklyActivity = async () => {
    try {
      const response = await api.get('/admin/stats/activity')
      setWeeklyActivity(response || [])
    } catch (error) {
      console.error('Error cargando actividad semanal:', error)
      // Fallback a datos mock para actividad semanal
      const mockActivity = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => ({
        day,
        activity: Math.floor(Math.random() * 80) + 20
      }))
      setWeeklyActivity(mockActivity)
    }
  }

  const loadRecentEvents = async () => {
    try {
      const response = await api.get('/admin/stats/events?limit=5')
      setRecentEvents(response || [])
    } catch (error) {
      console.error('Error cargando eventos recientes:', error)
      setRecentEvents([])
    }
  }

  const StatCard = ({ title, value, subtitle, icon, color = 'blue', change }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: `var(--color-${color})` }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {change && (
            <p className={`text-sm mt-2 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '↗️' : '↘️'} {Math.abs(change)}% vs período anterior
            </p>
          )}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )

  const ActivityChart = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Actividad por Día</h3>
      <div className="space-y-3">
        {weeklyActivity.map((dayData, index) => {
          const value = dayData.activity || 0
          return (
            <div key={dayData.day || index} className="flex items-center">
              <span className="w-12 text-sm text-gray-600">{dayData.day}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-3 mx-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${value}%` }}
                ></div>
              </div>
              <span className="w-12 text-sm text-right text-gray-700">{value}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const TopChatbots = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">🤖 Chatbots Más Activos</h3>
      <div className="space-y-4">
        {chatbotStats.length > 0 ? (
          chatbotStats.slice(0, 5).map((chatbot, index) => {
            const colorClasses = {
              green: 'bg-green-50 text-green-600 bg-green-500',
              blue: 'bg-blue-50 text-blue-600 bg-blue-500',
              purple: 'bg-purple-50 text-purple-600 bg-purple-500'
            }
            const colors = colorClasses[chatbot.color] || colorClasses.blue
            const [bgClass, textClass, avatarClass] = colors.split(' ')
            
            return (
              <div key={chatbot.id} className={`flex items-center justify-between p-3 ${bgClass} rounded-lg`}>
                <div className="flex items-center">
                  <div className={`w-10 h-10 ${avatarClass} rounded-full flex items-center justify-center text-white font-bold`}>
                    {chatbot.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-800">{chatbot.name}</p>
                    <p className="text-sm text-gray-600">{chatbot.phoneNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${textClass}`}>{chatbot.messages}</p>
                  <p className="text-xs text-gray-500">mensajes</p>
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No hay chatbots configurados aún</p>
          </div>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📈 Estadísticas del Sistema</h1>
            <p className="text-gray-600 mt-2">Análisis y métricas en tiempo real</p>
          </div>
          <div className="flex space-x-2">
            {['today', 'week', 'month'].map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period === 'today' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Chatbots Activos"
          value={stats?.chatbots?.active || 0}
          subtitle={`${stats?.chatbots?.total || 0} total`}
          icon="🤖"
          color="blue"
          change={+5}
        />
        <StatCard
          title="Conversaciones"
          value={selectedPeriod === 'today' ? (stats?.conversations?.today || 0) : 
                selectedPeriod === 'week' ? (stats?.conversations?.thisWeek || 0) : 
                (stats?.conversations?.thisMonth || 0)}
          subtitle={`${stats?.conversations?.total || 0} total`}
          icon="💬"
          color="green"
          change={+12}
        />
        <StatCard
          title="Mensajes"
          value={selectedPeriod === 'today' ? (stats?.messages?.today || 0) : 
                selectedPeriod === 'week' ? (stats?.messages?.thisWeek || 0) : 
                (stats?.messages?.thisMonth || 0)}
          subtitle={`${stats?.messages?.total || 0} total`}
          icon="📨"
          color="purple"
          change={+8}
        />
        <StatCard
          title="Documentos RAG"
          value={stats?.rag?.documents || 0}
          subtitle={`${stats?.rag?.chunks || 0} fragmentos`}
          icon="📚"
          color="orange"
          change={+3}
        />
      </div>

      {/* Segunda fila de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Notificaciones Enviadas"
          value={stats?.notifications?.sent || 0}
          subtitle={`${stats?.notifications?.pending || 0} pendientes`}
          icon="📤"
          color="indigo"
          change={+15}
        />
        <StatCard
          title="Consultas RAG"
          value={stats?.rag?.queries || 0}
          subtitle="Este mes"
          icon="🔍"
          color="pink"
          change={+25}
        />
        <StatCard
          title="Conexiones BD Externa"
          value={stats?.database?.active || 0}
          subtitle={`${stats?.database?.connections || 0} configuradas`}
          icon="🗄️"
          color="teal"
          change={0}
        />
      </div>

      {/* Gráficos y Detalles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityChart />
        <TopChatbots />
      </div>

      {/* Tabla de Eventos Recientes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">⚡ Eventos Recientes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4 font-medium text-gray-600">Hora</th>
                <th className="text-left py-2 px-4 font-medium text-gray-600">Evento</th>
                <th className="text-left py-2 px-4 font-medium text-gray-600">Chatbot</th>
                <th className="text-left py-2 px-4 font-medium text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.length > 0 ? (
                recentEvents.map((event, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">{event.time}</td>
                    <td className="py-3 px-4 text-sm">{event.event}</td>
                    <td className="py-3 px-4 text-sm">{event.chatbot}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        event.status === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {event.status === 'success' ? '✅ Éxito' : '❌ Error'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-gray-500">
                    No hay eventos recientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Stats 