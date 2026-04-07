// frontend/src/api/sales.js
// API client for sales and customer endpoints
import api from './client'

export const salesApi = {
  // Transactions
  getTransactions: (params) => api.get('/sales/transactions', { params }),
  getTransaction: (id) => api.get(`/sales/transactions/${id}`),
  createTransaction: (data) => api.post('/sales/transactions', data),

  // Customers (routed through sales blueprint on backend)
  getCustomers: () => api.get('/sales/customers'),
  getCustomer: (id) => api.get(`/sales/customers/${id}`),
  createCustomer: (data) => api.post('/sales/customers', data),
  updateCustomer: (id, data) => api.put(`/sales/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/sales/customers/${id}`),

  // Products (needed for sale line item selection — proxied from inventory)
  getProducts: () => api.get('/inventory/products'),

  // Drivers (for delivery assignment during sale)
  getDrivers: () => api.get('/sales/drivers'),
}