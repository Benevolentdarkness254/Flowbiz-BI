// frontend/src/api/auth.js
import api from './client'

export const authApi = {
  login:   (username, password) => api.post('/auth/login', { username, password }),
  logout:  ()                   => api.post('/auth/logout'),
  me:      ()                   => api.get('/auth/me'),
  createUser: (data)            => api.post('/auth/users', data),
}