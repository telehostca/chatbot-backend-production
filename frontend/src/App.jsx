import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Login from './components/Login'
import NotificationProvider from './components/NotificationProvider'
import LoadingProvider from './components/LoadingProvider'
import Organizations from './pages/Organizations'
import Chatbots from './pages/Chatbots'
import Templates from './pages/Templates'
import Database from './pages/Database'
import Orders from './pages/Orders'
import RAG from './pages/RAG'
import Stats from './pages/Stats'
import Sessions from './pages/Sessions'
import ScheduledNotifications from './pages/ScheduledNotifications'
import Dashboard from './pages/Dashboard'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [stats, setStats] = useState({ totalOrganizations: 0, totalChatbots: 0 })

  // Verificar autenticación al cargar la app
  useEffect(() => {
    const authStatus = localStorage.getItem('saas_authenticated')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  // Cargar estadísticas cuando esté autenticado
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
    }
  }, [isAuthenticated])

  const fetchStats = async () => {
    try {
      // Simular carga de stats - puedes conectar con la API real
      setStats({
        totalOrganizations: Math.floor(Math.random() * 50) + 1,
        totalChatbots: Math.floor(Math.random() * 200) + 10
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleLogin = (success) => {
    if (success) {
      setIsAuthenticated(true)
      localStorage.setItem('saas_authenticated', 'true')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('saas_authenticated')
    setIsMobileSidebarOpen(false)
  }

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen)
  }

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
  }

  // Mostrar login si no está autenticado
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <NotificationProvider>
      <LoadingProvider>
        <Router>
          <div className="flex flex-col min-h-screen bg-gray-50">
            <Header 
              stats={stats}
              onLogout={handleLogout}
              onToggleMobileSidebar={toggleMobileSidebar}
            />
            <div className="flex flex-1 relative">
              <Sidebar 
                isOpen={isMobileSidebarOpen}
                onClose={closeMobileSidebar}
              />
              <main className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6 lg:p-8">
                  <Routes>
                    <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/admin/" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/admin/dashboard" element={<Dashboard />} />
                    <Route path="/admin/organizations" element={<Organizations />} />
                    <Route path="/admin/chatbots" element={<Chatbots />} />
                    <Route path="/admin/templates" element={<Templates />} />
                    <Route path="/admin/database" element={<Database />} />
                    <Route path="/admin/orders" element={<Orders />} />
                    <Route path="/admin/rag" element={<RAG />} />
                    <Route path="/admin/stats" element={<Stats />} />
                    <Route path="/admin/sessions" element={<Sessions />} />
                    <Route path="/admin/scheduled-notifications" element={<ScheduledNotifications />} />
                  </Routes>
                </div>
              </main>
            </div>
          </div>
        </Router>
      </LoadingProvider>
    </NotificationProvider>
  )
}

export default App