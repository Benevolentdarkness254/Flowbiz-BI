// frontend/src/api/purchaseOrders.js
// API client for purchase order endpoints
import api from './client'

export const purchaseOrdersApi = {
  // List all purchase orders
  getPurchaseOrders: () => api.get('/purchase-orders/'),

  // Create a new purchase order
  createPurchaseOrder: (data) => api.post('/purchase-orders/', data),

  // Approve a pending purchase order
  approvePurchaseOrder: (id) => api.post(`/purchase-orders/${id}/approve`),

  // Decline a pending purchase order with a reason
  declinePurchaseOrder: (id, reason) =>
    api.post(`/purchase-orders/${id}/decline`, { reason }),
}
