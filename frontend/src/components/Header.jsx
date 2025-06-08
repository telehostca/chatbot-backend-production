import React from 'react'

const Header = ({ stats }) => (
  <header className="gradient-bg text-white shadow-lg">
    <div className="container mx-auto px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <i className="fas fa-robot text-3xl"></i>
          <div>
            <h1 className="text-2xl font-bold">ChatBot SaaS Manager</h1>
            <p className="text-blue-100 text-sm">Sistema Multi-Tenant</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
            <i className="fas fa-building mr-1"></i>
            {stats?.totalOrganizations ?? 0} Organizaciones
          </span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
            <i className="fas fa-robot mr-1"></i>
            {stats?.totalChatbots ?? 0} Chatbots
          </span>
        </div>
      </div>
    </div>
  </header>
)

export default Header 