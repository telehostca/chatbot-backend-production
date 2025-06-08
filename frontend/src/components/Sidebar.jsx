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

const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
        bg-white border-r border-gray-200 shadow-lg md:shadow-none
        flex flex-col min-h-screen
      `}>
        
        {/* Header del sidebar */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-2xl text-white">🤖</span>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
                <p className="text-sm text-gray-500">Multi-Tenant</p>
              </div>
            </div>
            
            {/* Botón cerrar en móvil */}
            <button
              onClick={onClose}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="fas fa-times text-gray-500"></i>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 bg-white overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  onClick={() => {
                    // Cerrar sidebar en móvil al hacer click en un enlace
                    if (window.innerWidth < 768) {
                      onClose?.()
                    }
                  }}
                  className={({ isActive }) =>
                    `w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 font-medium text-sm sm:text-base group ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 shadow-md border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-blue-700 hover:shadow-sm'
                    }`
                  }
                >
                  <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-200">
                    {item.emoji}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {/* Indicador activo */}
                  <span className="w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer del sidebar */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">Sistema Activo</div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600">Backend Conectado</span>
            </div>
            <div className="mt-3 text-xs text-gray-400">
              v2.0 - Multi-Tenant SaaS
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar 