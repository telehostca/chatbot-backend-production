import React, { useState } from 'react'

const Header = ({ stats, onLogout, onToggleMobileSidebar }) => {
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white shadow-xl border-b-2 border-blue-800 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y título - Mobile first */}
          <div className="flex items-center space-x-3">
            {/* Botón hamburguesa para móvil */}
            <button
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
            
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🤖</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl lg:text-2xl font-bold">ChatBot SaaS Manager</h1>
                <p className="text-blue-100 text-xs lg:text-sm -mt-1">Sistema Multi-Tenant</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold">SaaS</h1>
              </div>
            </div>
          </div>

          {/* Stats y acciones */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            
            {/* Stats - Oculto en móvil muy pequeño */}
            <div className="hidden sm:flex items-center space-x-2 lg:space-x-3">
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs lg:text-sm border border-white/30">
                <i className="fas fa-building mr-1"></i>
                <span className="hidden lg:inline">Organizaciones: </span>
                <span className="font-semibold">{stats?.totalOrganizations ?? 0}</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs lg:text-sm border border-white/30">
                <i className="fas fa-robot mr-1"></i>
                <span className="hidden lg:inline">Chatbots: </span>
                <span className="font-semibold">{stats?.totalChatbots ?? 0}</span>
              </div>
            </div>

            {/* Notificaciones */}
            <button className="relative p-2 rounded-lg hover:bg-white/20 transition-colors">
              <i className="fas fa-bell text-lg"></i>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              </span>
            </button>

            {/* Menu de usuario */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-sm"></i>
                </div>
                <span className="hidden md:block text-sm font-medium">Admin</span>
                <i className="fas fa-chevron-down text-xs"></i>
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-800">Administrador</p>
                    <p className="text-xs text-gray-500">admin@saas.com</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      onLogout()
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats para móvil */}
        <div className="sm:hidden pb-3">
          <div className="flex justify-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs border border-white/30">
              <i className="fas fa-building mr-1"></i>
              {stats?.totalOrganizations ?? 0} Org
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs border border-white/30">
              <i className="fas fa-robot mr-1"></i>
              {stats?.totalChatbots ?? 0} Bots
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header 