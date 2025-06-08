import React from 'react'
import { NavLink } from 'react-router-dom'

const menuItems = [
  { id: 'dashboard', icon: 'fas fa-chart-line', label: 'Dashboard', emoji: '📊', path: '/dashboard' },
  { id: 'organizations', icon: 'fas fa-building', label: 'Organizaciones', emoji: '🏢', path: '/organizations' },
  { id: 'chatbots', icon: 'fas fa-robot', label: 'Chatbots', emoji: '🤖', path: '/chatbots' },
  { id: 'stats', icon: 'fas fa-chart-bar', label: 'Estadísticas', emoji: '📈', path: '/stats' },
  { id: 'sessions', icon: 'fas fa-comments', label: 'Sesiones', emoji: '💬', path: '/sessions' },
  { id: 'scheduled-notifications', icon: 'fas fa-clock', label: 'Notificaciones Programadas', emoji: '⏰', path: '/scheduled-notifications' },
  { id: 'templates', icon: 'fas fa-file-alt', label: 'Plantillas', emoji: '📝', path: '/templates' },
  { id: 'database', icon: 'fas fa-database', label: 'BD Externa', emoji: '🗄️', path: '/database' },
  { id: 'orders', icon: 'fas fa-shopping-cart', label: 'Órdenes', emoji: '🛒', path: '/orders' },
  { id: 'rag', icon: 'fas fa-brain', label: 'RAG', emoji: '🧠', path: '/rag' },
]

const Sidebar = () => {
  return (
    <aside className="sidebar-classic min-h-screen w-64 flex flex-col relative border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-2xl text-white">🤖</span>
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-sm text-gray-500">Multi-Tenant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 bg-white">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center px-4 py-2 text-left rounded-lg transition-all duration-150 font-medium text-base ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-blue-700'
                  }`
                }
              >
                <span className="text-xl mr-3">{item.emoji}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-1">Sistema Activo</div>
          <div className="flex items-center justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-xs text-gray-600">Backend Conectado</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar 