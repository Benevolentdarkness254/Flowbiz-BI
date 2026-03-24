// frontend/src/api/client.js
import axios from 'axios'

/**
 * Pre-configured axios instance used by all API modules.
 *
 * withCredentials: true — tells axios to include cookies in every request.
 * This is what sends the HTTP-only JWT cookie that Flask-JWT-Extended reads.
 * Without this, the browser strips cookies from cross-origin requests.
 * In development, the Vite proxy makes requests same-origin so this is
 * mostly for production, but it is harmless to always include it.
 */
const api = axios.create({
  baseURL:         '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Global response interceptor — redirect to login on 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      // JWT expired or missing — send user back to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api