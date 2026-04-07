// frontend/src/api/inventory.js
// API client for inventory, product, and supplier endpoints
import api from './client'

export const inventoryApi = {
  // Products
  getProducts: () => api.get('/inventory/products'),
  getStatus: () => api.get('/inventory/status'),
  getAlerts: () => api.get('/inventory/alerts'),
  adjustStock: (data) => api.post('/inventory/adjust', data),

  // Suppliers
  getSuppliers: () => api.get('/inventory/suppliers'),
  getSupplierPricing: (supplierId) => api.get(`/inventory/suppliers/${supplierId}/pricing`),
}