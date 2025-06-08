import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [filter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      
      // Simular datos de órdenes
      const mockOrders = [
        {
          id: 'ORD-001',
          customerName: 'María González',
          customerPhone: '+58 424-123-4567',
          chatbot: 'FarmabienBot',
          items: [
            { name: 'Acetaminofén 500mg', quantity: 2, price: 2.50 },
            { name: 'Vitamina C', quantity: 1, price: 8.00 }
          ],
          total: 13.00,
          status: 'pending',
          paymentMethod: 'cash',
          deliveryAddress: 'Av. Principal 456, Apt 3B',
          orderDate: '2025-06-05T14:30:00Z',
          estimatedDelivery: '2025-06-05T16:30:00Z',
          notes: 'Entregar después de las 3 PM'
        },
        {
          id: 'ORD-002',
          customerName: 'Carlos Rodríguez',
          customerPhone: '+58 414-987-6543',
          chatbot: 'GómezBot',
          items: [
            { name: 'Ibuprofeno 400mg', quantity: 1, price: 3.25 },
            { name: 'Jarabe para la tos', quantity: 1, price: 6.75 }
          ],
          total: 10.00,
          status: 'confirmed',
          paymentMethod: 'card',
          deliveryAddress: 'Calle 15 con Av. 20, Casa 45',
          orderDate: '2025-06-05T13:15:00Z',
          estimatedDelivery: '2025-06-05T15:15:00Z',
          notes: ''
        },
        {
          id: 'ORD-003',
          customerName: 'Ana Martínez',
          customerPhone: '+58 426-555-1234',
          chatbot: 'FarmabienBot',
          items: [
            { name: 'Complejo B', quantity: 1, price: 12.00 },
            { name: 'Crema hidratante', quantity: 2, price: 7.50 }
          ],
          total: 27.00,
          status: 'delivered',
          paymentMethod: 'transfer',
          deliveryAddress: 'Urbanización Los Jardines, Casa 78',
          orderDate: '2025-06-05T10:45:00Z',
          estimatedDelivery: '2025-06-05T12:45:00Z',
          deliveredAt: '2025-06-05T12:30:00Z',
          notes: 'Cliente satisfecho'
        },
        {
          id: 'ORD-004',
          customerName: 'Pedro López',
          customerPhone: '+58 412-777-8888',
          chatbot: 'GómezBot',
          items: [
            { name: 'Alcohol en gel', quantity: 3, price: 2.00 },
            { name: 'Mascarillas N95', quantity: 5, price: 1.50 }
          ],
          total: 13.50,
          status: 'cancelled',
          paymentMethod: 'cash',
          deliveryAddress: 'Centro Comercial Plaza Mayor',
          orderDate: '2025-06-04T16:20:00Z',
          cancelledAt: '2025-06-04T17:00:00Z',
          notes: 'Cliente canceló por cambio de planes'
        }
      ]
      
      setOrders(mockOrders)
    } catch (error) {
      console.error('Error cargando órdenes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'confirmed': return '✅'
      case 'delivered': return '🚚'
      case 'cancelled': return '❌'
      default: return '❓'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'confirmed': return 'Confirmada'
      case 'delivered': return 'Entregada'
      case 'cancelled': return 'Cancelada'
      default: return 'Desconocido'
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerPhone.includes(searchTerm)
    return matchesFilter && matchesSearch
  })

  const OrderCard = ({ order }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
         onClick={() => { setSelectedOrder(order); setShowDetails(true) }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{order.id}</h3>
          <p className="text-sm text-gray-600">{order.customerName}</p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
          {getStatusIcon(order.status)} {getStatusText(order.status)}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Total:</span>
          <span className="font-semibold text-gray-800">${order.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Chatbot:</span>
          <span>{order.chatbot}</span>
        </div>
        <div className="flex justify-between">
          <span>Fecha:</span>
          <span>{new Date(order.orderDate).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Productos:</span>
          <span>{order.items.length} items</span>
        </div>
      </div>
    </div>
  )

  const OrderDetailsModal = () => {
    if (!showDetails || !selectedOrder) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Detalles de la Orden</h2>
              <button 
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">📋 Información General</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>ID:</strong> {selectedOrder.id}</div>
                  <div><strong>Estado:</strong> 
                    <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusIcon(selectedOrder.status)} {getStatusText(selectedOrder.status)}
                    </span>
                  </div>
                  <div><strong>Chatbot:</strong> {selectedOrder.chatbot}</div>
                  <div><strong>Fecha:</strong> {new Date(selectedOrder.orderDate).toLocaleString()}</div>
                  {selectedOrder.estimatedDelivery && (
                    <div><strong>Entrega estimada:</strong> {new Date(selectedOrder.estimatedDelivery).toLocaleString()}</div>
                  )}
                  {selectedOrder.deliveredAt && (
                    <div><strong>Entregada:</strong> {new Date(selectedOrder.deliveredAt).toLocaleString()}</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">👤 Cliente</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Nombre:</strong> {selectedOrder.customerName}</div>
                  <div><strong>Teléfono:</strong> {selectedOrder.customerPhone}</div>
                  <div><strong>Dirección:</strong> {selectedOrder.deliveryAddress}</div>
                  <div><strong>Método de pago:</strong> {selectedOrder.paymentMethod === 'cash' ? 'Efectivo' : selectedOrder.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">🛍️ Productos</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium text-gray-600">Producto</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-600">Cantidad</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-600">Precio Unit.</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2 px-4">{item.name}</td>
                        <td className="py-2 px-4">{item.quantity}</td>
                        <td className="py-2 px-4">${item.price.toFixed(2)}</td>
                        <td className="py-2 px-4 font-semibold">${(item.quantity * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="border-b-2 border-gray-300">
                      <td colSpan="3" className="py-2 px-4 text-right font-bold">Total:</td>
                      <td className="py-2 px-4 font-bold text-lg">${selectedOrder.total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">📝 Notas</h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedOrder.notes}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              {selectedOrder.status === 'pending' && (
                <>
                  <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                    ✅ Confirmar
                  </button>
                  <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                    ❌ Cancelar
                  </button>
                </>
              )}
              {selectedOrder.status === 'confirmed' && (
                <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                  🚚 Marcar como Entregada
                </button>
              )}
              <button 
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
            <h1 className="text-3xl font-bold text-gray-800">🛒 Gestión de Órdenes</h1>
            <p className="text-gray-600 mt-2">Administra las órdenes de tus chatbots</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{filteredOrders.length}</p>
            <p className="text-sm text-gray-600">órdenes {filter === 'all' ? 'totales' : getStatusText(filter)}</p>
          </div>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex space-x-2">
            {['all', 'pending', 'confirmed', 'delivered', 'cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Todas' : getStatusText(status)}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, ID o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-80"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              🔍
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { status: 'pending', count: orders.filter(o => o.status === 'pending').length, color: 'yellow' },
          { status: 'confirmed', count: orders.filter(o => o.status === 'confirmed').length, color: 'blue' },
          { status: 'delivered', count: orders.filter(o => o.status === 'delivered').length, color: 'green' },
          { status: 'cancelled', count: orders.filter(o => o.status === 'cancelled').length, color: 'red' }
        ].map(stat => (
          <div key={stat.status} className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{getStatusText(stat.status)}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
              </div>
              <div className="text-2xl">{getStatusIcon(stat.status)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de Órdenes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl font-semibold text-gray-800 mb-2">No hay órdenes</p>
          <p className="text-gray-600">
            {searchTerm ? 'No se encontraron órdenes que coincidan con tu búsqueda' : 'No hay órdenes con el filtro seleccionado'}
          </p>
        </div>
      )}

      <OrderDetailsModal />
    </div>
  )
}

export default Orders 