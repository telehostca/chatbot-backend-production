const API_BASE_URL = '/api'

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body)
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (jsonError) {
          // Si no se puede parsear el JSON del error, usar el mensaje por defecto
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error)
      throw error
    }
  }

  // Método GET helpers
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' })
  }

  async post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body })
  }

  async put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body })
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }

  // Métodos para chatbots
  async getChatbots() {
    return this.request('/admin/multi-tenant/chatbots')
  }

  async getChatbot(id) {
    return this.request(`/admin/multi-tenant/chatbots/${id}`)
  }

  async createChatbot(chatbotData) {
    return this.request('/admin/multi-tenant/chatbots', {
      method: 'POST',
      body: chatbotData,
    })
  }

  async updateChatbot(id, chatbotData) {
    return this.request(`/admin/multi-tenant/chatbots/${id}`, {
      method: 'PUT',
      body: chatbotData,
    })
  }

  async deleteChatbot(id) {
    return this.request(`/admin/multi-tenant/chatbots/${id}`, {
      method: 'DELETE',
    })
  }

  // Métodos para organizaciones
  async getOrganizations() {
    return this.request('/admin/multi-tenant/organizations')
  }

  async createOrganization(orgData) {
    return this.request('/admin/multi-tenant/organizations', {
      method: 'POST',
      body: orgData,
    })
  }

  async updateOrganization(id, orgData) {
    return this.request(`/admin/multi-tenant/organizations/${id}`, {
      method: 'PUT',
      body: orgData,
    })
  }

  async deleteOrganization(id) {
    return this.request(`/admin/multi-tenant/organizations/${id}`, {
      method: 'DELETE',
    })
  }

  // Métodos para configuraciones de base de datos
  async getDatabaseConfigs() {
    return this.request('/database-config')
  }

  async getDatabaseConfig(chatbotId) {
    return this.request(`/database-config/${chatbotId}`)
  }

  async createDatabaseConfig(configData) {
    return this.request('/database-config', {
      method: 'POST',
      body: configData,
    })
  }

  async updateDatabaseConfig(chatbotId, configData) {
    return this.request(`/database-config/${chatbotId}`, {
      method: 'PUT',
      body: configData,
    })
  }

  async deleteDatabaseConfig(chatbotId) {
    return this.request(`/database-config/${chatbotId}`, {
      method: 'DELETE',
    })
  }

  async testDatabaseConnection(connectionData) {
    return this.request('/database-config/test-connection', {
      method: 'POST',
      body: connectionData,
    })
  }

  async getDatabaseContext(chatbotId) {
    return this.request(`/database-config/${chatbotId}/context`)
  }

  async detectDatabaseSchema(connectionData) {
    return this.request('/database-config/detect-schema', {
      method: 'POST',
      body: connectionData,
    })
  }

  async applyDetectedConfiguration(chatbotId, detectedConfig) {
    return this.request(`/database-config/apply-detected/${chatbotId}`, {
      method: 'POST',
      body: detectedConfig,
    })
  }

  async generateAIContext(tablesData) {
    return this.request('/database-config/generate-ai-context', {
      method: 'POST',
      body: { tables: tablesData },
    })
  }

  // Métodos para notificaciones
  async getNotifications() {
    return this.request('/notifications')
  }

  async createNotification(notificationData) {
    return this.request('/notifications', {
      method: 'POST',
      body: notificationData,
    })
  }

  async updateNotification(id, notificationData) {
    return this.request(`/notifications/${id}`, {
      method: 'PUT',
      body: notificationData,
    })
  }

  async deleteNotification(id) {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE',
    })
  }

  // Métodos para órdenes
  async getOrders(page = 1, limit = 10) {
    return this.request(`/orders?page=${page}&limit=${limit}`)
  }

  // Métodos para sesiones de chat
  async getChatSessions() {
    return this.request('/chat-sessions')
  }

  async getSessions(params = {}) {
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.chatbotId) queryParams.append('chatbotId', params.chatbotId)
    if (params.search) queryParams.append('search', params.search)
    if (params.status) queryParams.append('status', params.status)
    
    const url = `/admin/sessions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return this.request(url)
  }

  async getSessionMessages(sessionId) {
    return this.request(`/admin/sessions/${sessionId}/messages`)
  }
  
  async getSessionStats() {
    return this.request('/admin/sessions/stats')
  }

  async sendMessageToSession(sessionId, message) {
    return this.request(`/admin/sessions/${sessionId}/send`, {
      method: 'POST',
      body: { message }
    })
  }

  // Métodos para estadísticas
  async getStats() {
    return this.request('/admin/multi-tenant/stats')
  }

  // Métodos para RAG
  async getRAGKnowledgeBases(chatbotId) {
    return this.request(`/rag/knowledge-bases/${chatbotId}`)
  }

  async getRAGStats(chatbotId) {
    return this.request(`/rag/stats/${chatbotId}`)
  }

  async uploadRAGDocument(chatbotId, formData) {
    const url = `${API_BASE_URL}/rag/upload-document/${chatbotId}`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData, // FormData directly, no JSON conversion
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }
      
      return { data }
    } catch (error) {
      console.error(`Upload Error:`, error)
      throw error
    }
  }

  async processRAGDocument(data) {
    return this.request('/rag/process-document', {
      method: 'POST',
      body: data,
    })
  }

  async processRAGUrl(data) {
    return this.request('/rag/process-url', {
      method: 'POST',
      body: data,
    })
  }

  async queryRAG(ragQuery) {
    return this.request('/rag/simple-query', {
      method: 'POST',
      body: ragQuery,
    })
  }

  async deleteRAGKnowledgeBase(knowledgeBaseId) {
    return this.request(`/rag/knowledge-base/${knowledgeBaseId}`, {
      method: 'DELETE',
    })
  }

  // Métodos para plantillas de notificación
  async getNotificationTemplates(chatbotId = null) {
    const url = chatbotId ? `/admin/multi-tenant/notifications?chatbotId=${chatbotId}` : '/admin/multi-tenant/notifications'
    return this.request(url)
  }

  async createNotificationTemplate(templateData) {
    return this.request('/admin/multi-tenant/notifications', {
      method: 'POST',
      body: templateData,
    })
  }

  async updateNotificationTemplate(id, templateData) {
    return this.request(`/admin/multi-tenant/notifications/${id}`, {
      method: 'PUT',
      body: templateData,
    })
  }

  async deleteNotificationTemplate(id) {
    return this.request(`/admin/multi-tenant/notifications/${id}`, {
      method: 'DELETE',
    })
  }

  async duplicateNotificationTemplate(id) {
    return this.request(`/admin/multi-tenant/notifications/${id}/duplicate`, {
      method: 'POST',
    })
  }

  async toggleNotificationTemplate(id) {
    return this.request(`/admin/multi-tenant/notifications/${id}/toggle`, {
      method: 'POST',
    })
  }

  async testNotificationTemplate(id, phoneNumber, chatbotId = null) {
    return this.request(`/admin/multi-tenant/notifications/${id}/test`, {
      method: 'POST',
      body: { phoneNumber, chatbotId },
    })
  }

  // Métodos para configuración de Cron
  async getCronConfig() {
    return this.request('/admin/multi-tenant/notifications/cron/config')
  }

  async updateCronConfig(config) {
    return this.request('/admin/multi-tenant/notifications/cron/config', {
      method: 'PUT',
      body: config,
    })
  }

  async getScheduledNotifications() {
    return this.request('/notifications/scheduled')
  }

  async scheduleNotification(phoneNumber, message, scheduleDate, chatbotId) {
    return this.request('/notifications/schedule', {
      method: 'POST',
      body: { phoneNumber, message, scheduleDate, chatbotId },
    })
  }

  // Métodos para plantillas de productos
  async getTemplates(chatbotId) {
    return this.request(`/admin/multi-tenant/chatbots/${chatbotId}/templates`)
  }

  async updateTemplate(chatbotId, templateData) {
    return this.request(`/admin/multi-tenant/chatbots/${chatbotId}/templates`, {
      method: 'PUT',
      body: templateData,
    })
  }

  async previewTemplate(chatbotId, templateData) {
    return this.request(`/admin/multi-tenant/chatbots/${chatbotId}/templates/preview`, {
      method: 'POST',
      body: templateData,
    })
  }

  // Métodos para notificaciones instantáneas
  async sendInstantNotification(notificationData) {
    return this.request('/notifications/instant', {
      method: 'POST',
      body: notificationData,
    })
  }

  // Health check
  async health() {
    return this.request('/health')
  }

  // Métodos para contactos de notificaciones
  async getContactStats() {
    return this.request('/notifications/contacts/stats')
  }

  async getAudienceFilters() {
    return this.request('/notifications/contacts/audience-filters')
  }

  async searchContacts(filters) {
    return this.request('/notifications/contacts/search', {
      method: 'POST',
      body: filters,
    })
  }

  async getContactsByAudience(audience, chatbotIds = []) {
    const params = new URLSearchParams({ audience })
    if (chatbotIds && chatbotIds.length > 0) {
      params.append('chatbotIds', chatbotIds.join(','))
    }
    return this.request(`/notifications/contacts/by-audience?${params}`)
  }

  async validatePhoneNumbers(phoneNumbers) {
    return this.request('/notifications/contacts/validate-phones', {
      method: 'POST',
      body: { phoneNumbers },
    })
  }

  async getContactsByPhones(phoneNumbers) {
    return this.request('/notifications/contacts/by-phones', {
      method: 'POST',
      body: { phoneNumbers },
    })
  }

  async previewNotificationContacts(payload) {
    return this.request('/notifications/contacts/preview', {
      method: 'POST',
      body: payload,
    })
  }
}

const api = new ApiService()
export { api }
export default api 