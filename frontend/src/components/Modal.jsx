import React from 'react'

const Modal = ({ open, onClose, title, children, maxWidth }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        className={`relative bg-white rounded-lg shadow-xl w-full ${maxWidth || 'max-w-lg'} mx-4 sm:mx-0 overflow-hidden`}
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {title && (
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-6" style={{ flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal 