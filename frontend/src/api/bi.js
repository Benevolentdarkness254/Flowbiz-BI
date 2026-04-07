// frontend/src/api/bi.js
// API client for business intelligence and dashboard endpoints
import api from './client'

export const biApi = {
  // Shared dashboard stats
  getDashboard: () => api.get('/bi/dashboard'),

  // Role-specific dashboards
  getSalesDashboard: () => api.get('/bi/dashboard/sales'),
  getInventoryDashboard: () => api.get('/bi/dashboard/inventory'),
  getDriverDashboard: () => api.get('/bi/dashboard/driver'),
  getAdminDashboard: () => api.get('/bi/dashboard/admin'),

  // Reports
  getRevenue: (start, end) => api.get('/bi/revenue', {
    params: { start_date: start, end_date: end }
  }),
  getCustomers: () => api.get('/bi/customers'),
  getKRAQueue: () => api.get('/bi/kra-queue'),
  getOverview: (start, end) => api.get('/bi/overview', {
    params: { start_date: start, end_date: end }
  }),
  getDeliveryAnalytics: () => api.get('/bi/deliveries/analytics'),
  getPOAnalytics: () => api.get('/bi/purchase-orders/analytics'),
  getHRAnalytics: () => api.get('/bi/hr/analytics'),
}