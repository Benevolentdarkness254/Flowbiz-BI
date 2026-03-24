// frontend/src/api/sales.js
import api from './client'

export const salesApi = {
  getTransactions: (params) => api.get('/sales/transactions', { params }),
  getTransaction:  (id)     => api.get(`/sales/transactions/${id}`),
  createTransaction: (data) => api.post('/sales/transactions', data),
  getCustomers:    ()       => api.get('/sales/customers'),
  createCustomer:  (data)   => api.post('/sales/customers', data),
}