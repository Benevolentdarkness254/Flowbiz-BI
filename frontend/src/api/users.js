// frontend/src/api/users.js
// API client for user management endpoints
import api from './client'

export const usersApi = {
  // List all users
  getUsers: (params) => api.get('/auth/users', { params }),

  // Get a single user
  getUser: (id) => api.get(`/auth/users/${id}`),

  // Create a new user
  createUser: (data) => api.post('/auth/users', data),

  // Update a user
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),

  // Soft-delete (deactivate) a user
  deleteUser: (id) => api.delete(`/auth/users/${id}`),

  // Restore a deleted user
  restoreUser: (id) => api.post(`/auth/users/${id}/restore`),

  // List available roles
  getRoles: () => api.get('/auth/roles'),
}
