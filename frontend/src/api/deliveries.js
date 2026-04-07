// frontend/src/api/deliveries.js
// API client for delivery endpoints (outbound and inbound)
import api from './client'

export const deliveriesApi = {
  // Outbound deliveries (to customers)
  getOutboundDeliveries: (params) => api.get('/deliveries/outbound', { params }),
  createOutboundDelivery: (data) => api.post('/deliveries/outbound', data),
  updateOutboundDelivery: (id, data) => api.patch(`/deliveries/outbound/${id}`, data),

  // Get goods manifest for a delivery (products being delivered)
  getDeliveryManifest: (id) => api.get(`/deliveries/outbound/${id}/manifest`),

  // Inbound deliveries (from suppliers)
  getInboundDeliveries: (params) => api.get('/deliveries/inbound', { params }),
  createInboundDelivery: (data) => api.post('/deliveries/inbound', data),

  // List drivers for delivery assignment
  getDrivers: () => api.get('/deliveries/drivers'),
}
