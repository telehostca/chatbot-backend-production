import React, { useEffect, useState } from 'react'
import api from '../services/api'

const Dashboard = () => {
  const [stats, setStats] = useState({})

  useEffect(() => {
    api.getStats().then(res => setStats(res.data || {}))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-10">
      <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">
        🚀 Dashboard Futurista
      </h1>
      <p className="text-blue-200 mb-10 text-lg">Resumen visual del sistema multi-tenant</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-6xl">
        <div className="glass-card group">
          <div className="text-5xl mb-2 transition-transform group-hover:scale-110">🏢</div>
          <div className="text-4xl font-bold text-white drop-shadow">{stats.totalOrganizations ?? 0}</div>
          <div className="text-blue-200 mt-2 text-lg">Organizaciones</div>
        </div>
        <div className="glass-card group">
          <div className="text-5xl mb-2 transition-transform group-hover:scale-110">🤖</div>
          <div className="text-4xl font-bold text-white drop-shadow">{stats.totalChatbots ?? 0}</div>
          <div className="text-blue-200 mt-2 text-lg">Chatbots Totales</div>
        </div>
        <div className="glass-card group">
          <div className="text-5xl mb-2 transition-transform group-hover:scale-110">⚡</div>
          <div className="text-4xl font-bold text-white drop-shadow">{stats.activeChatbots ?? 0}</div>
          <div className="text-blue-200 mt-2 text-lg">Chatbots Activos</div>
        </div>
        <div className="glass-card group">
          <div className="text-5xl mb-2 transition-transform group-hover:scale-110">🛒</div>
          <div className="text-4xl font-bold text-white drop-shadow">{stats.totalOrders ?? 0}</div>
          <div className="text-blue-200 mt-2 text-lg">Órdenes</div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 