// frontend/src/api/inventory.js
import api from './client'

export const inventoryApi = {
  getProducts:    ()     => api.get('/inventory/products'),
  getStatus:      ()     => api.get('/inventory/status'),
  getAlerts:      ()     => api.get('/inventory/alerts'),
  adjustStock:    (data) => api.post('/inventory/adjust', data),
}