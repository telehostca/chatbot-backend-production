import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
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
  return (
    <NotificationProvider>
      <LoadingProvider>
        <Router>
          <div className="flex flex-col min-h-screen bg-gray-100">
            <Header />
            <div className="flex flex-1">
              <div className="hidden md:block">
                <Sidebar />
              </div>
              <main className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/organizations" element={<Organizations />} />
                    <Route path="/chatbots" element={<Chatbots />} />
                    <Route path="/templates" element={<Templates />} />
                    <Route path="/database" element={<Database />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/rag" element={<RAG />} />
                    <Route path="/stats" element={<Stats />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/scheduled-notifications" element={<ScheduledNotifications />} />
                    <Route path="/scheduled-notifications" element={<ScheduledNotifications />} />
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