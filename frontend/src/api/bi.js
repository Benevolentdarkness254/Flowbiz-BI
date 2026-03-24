// frontend/src/api/bi.js
import api from './client'

export const biApi = {
  getDashboard: ()               => api.get('/bi/dashboard'),
  getRevenue:   (start, end)     => api.get('/bi/revenue', {
    params: { start_date: start, end_date: end }
  }),
  getCustomers: ()               => api.get('/bi/customers'),
  getKRAQueue:  ()               => api.get('/bi/kra-queue'),
}