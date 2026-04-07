// frontend/src/api/suppliers.js
// API client for supplier management with approval workflow
import api from './client'

export const suppliersApi = {
  // List suppliers with optional filters (approval_status, is_active, page, per_page)
  getSuppliers: (params) => api.get('/suppliers/', { params }),

  // Get single supplier details
  getSupplier: (id) => api.get(`/suppliers/${id}`),

  // Create a new supplier application (starts as pending)
  createSupplier: (data) => api.post('/suppliers/', data),

  // Update an existing supplier
  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data),

  // Soft-delete a supplier
  deleteSupplier: (id) => api.delete(`/suppliers/${id}`),

  // Approval workflow (owner only)
  approveSupplier: (id) => api.post(`/suppliers/${id}/approve`),
  rejectSupplier: (id, reason) => api.post(`/suppliers/${id}/reject`, { reason }),
  suspendSupplier: (id) => api.post(`/suppliers/${id}/suspend`),
  reinstateSupplier: (id) => api.post(`/suppliers/${id}/reinstate`),

  // Performance analytics
  getPerformance: (id) => api.get(`/suppliers/${id}/performance`),
}
