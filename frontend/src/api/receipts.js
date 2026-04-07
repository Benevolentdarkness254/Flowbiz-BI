// frontend/src/api/receipts.js
// API client for receipt endpoints
import api from './client'

export const receiptsApi = {
  // List receipts with pagination
  getReceipts: (params) => api.get('/receipts/', { params }),

  // Get a single receipt by ID
  getReceipt: (id) => api.get(`/receipts/${id}`),

  // Void a receipt with a reason
  voidReceipt: (id, reason) => api.post(`/receipts/${id}/void`, { reason }),

  // Dispatch/resend a receipt via a specific channel
  dispatchReceipt: (id, channel, destination) =>
    api.post(`/receipts/${id}/dispatch`, { channel, destination }),
}