// frontend/src/api/system.js
// API client for system-level endpoints (audit, backups, settings, logs)
import api from './client'

export const systemApi = {
  // Audit trail
  getAuditLogs: (params) => api.get('/system/audit', { params }),
  getAuditTables: () => api.get('/system/audit/tables'),

  // Backups
  getBackups: () => api.get('/system/backups'),
  createBackup: () => api.post('/system/backups'),
  deleteBackup: (filename) => api.delete(`/system/backups/${filename}`),

  // Settings
  getSettings: () => api.get('/system/settings'),
  updateSettings: (settings) => api.patch('/system/settings', settings),

  // System logs
  getSystemLogs: (params) => api.get('/system/logs', { params }),
}
