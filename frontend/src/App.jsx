// frontend/src/App.jsx
import 'bootstrap/dist/css/bootstrap.min.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute   from './components/common/ProtectedRoute'
import AppShell         from './components/common/AppShell'
import Login            from './pages/Login'
import Dashboard        from './pages/Dashboard'
import Sales            from './pages/Sales'
import Inventory        from './pages/Inventory'
import Reports          from './pages/Reports'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* All authenticated routes share the AppShell layout */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />

            <Route path="sales" element={
              <ProtectedRoute permission="sale.view">
                <Sales />
              </ProtectedRoute>
            } />
            
            <Route path="customers" element={
              <ProtectedRoute permission="customer.manage"><Customers /></ProtectedRoute>
            } />
            
            <Route path="inventory" element={
              <ProtectedRoute permission="inventory.view">
                <Inventory />
              </ProtectedRoute>
            } />

            <Route path="purchase-orders" element={
              <ProtectedRoute permission="po.view"><PurchaseOrders /></ProtectedRoute>
            } />

            <Route path="receipts" element={
              <ProtectedRoute permission="receipt.view"><Receipts /></ProtectedRoute>
            } />

            <Route path="reports" element={
              <ProtectedRoute permission="report.view">
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="deliveries" element={
              <ProtectedRoute permission="delivery.view"><Deliveries /></ProtectedRoute>
            } />

             <Route path="system/logs" element={
              <ProtectedRoute permission="system.logs"><SystemLogs /></ProtectedRoute>
            } />

            <Route path="system/audit" element={
              <ProtectedRoute permission="system.audit"><AuditTrail /></ProtectedRoute>
            } />

            <Route path="system/backups" element={
              <ProtectedRoute permission="system.backup"><Backups /></ProtectedRoute>
            } />

            <Route path="settings" element={
              <ProtectedRoute permission="system.config"><Settings /></ProtectedRoute>
            } />

            {/* 403 page */}
            <Route path="403" element={
              <div className="text-center py-5">
                <h3>Access Denied</h3>
                <p>You do not have permission to view this page.</p>
              </div>
            } />

            {/* 404 catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}