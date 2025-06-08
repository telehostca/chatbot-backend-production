import React, { createContext, useContext, useState } from 'react'

const NotificationContext = createContext()

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])

  const showNotification = (type, title, message) => {
    const id = Date.now()
    const notification = { id, type, title, message }
    
    setNotifications(prev => [...prev, notification])
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id)
    }, 5000)
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getNotificationClasses = (type) => {
    const baseClasses = "mb-4 p-4 rounded-lg border-l-4 fade-in"
    switch (type) {
      case 'success':
        return `${baseClasses} notification-success border-green-500`
      case 'error':
        return `${baseClasses} notification-error border-red-500`
      case 'warning':
        return `${baseClasses} notification-warning border-yellow-500`
      case 'info':
        return `${baseClasses} notification-info border-blue-500`
      default:
        return `${baseClasses} notification-info border-blue-500`
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle'
      case 'error':
        return 'fas fa-exclamation-circle'
      case 'warning':
        return 'fas fa-exclamation-triangle'
      case 'info':
        return 'fas fa-info-circle'
      default:
        return 'fas fa-info-circle'
    }
  }

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={getNotificationClasses(notification.type)}
          >
            <div className="flex items-start">
              <i className={`${getIcon(notification.type)} mr-3 mt-1`}></i>
              <div className="flex-1">
                <h4 className="font-medium">{notification.title}</h4>
                <p className="text-sm mt-1">{notification.message}</p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-3 text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export default NotificationProvider 