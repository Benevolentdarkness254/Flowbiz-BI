// frontend/src/api/receipts.js
import api from './client'

export const receiptsApi = {
  getReceipts:  (params)              => api.get('/receipts/', { params }),
  getReceipt:   (id)                  => api.get(`/receipts/${id}`),
  voidReceipt:  (id, reason)          => api.post(`/receipts/${id}/void`, { reason }),
  dispatch:     (id, channel, dest)   => api.post(`/receipts/${id}/dispatch`, {
    channel, destination: dest
  }),
}