// frontend/src/App.jsx
// Root component — defines all routes and wraps them with auth/providers
import 'bootstrap/dist/css/bootstrap.min.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute   from './components/common/ProtectedRoute'
import AppShell         from './components/common/AppShell'

// Page components
import Login            from './pages/Login'
import Dashboard        from './pages/Dashboard'
import Sales            from './pages/Sales'
import Inventory        from './pages/Inventory'
import Reports          from './pages/Reports'
import Customers        from './pages/Customers'
import PurchaseOrders   from './pages/PurchaseOrders'
import Deliveries       from './pages/Deliveries'
import Receipts         from './pages/Receipts'
import AuditTrail       from './pages/AuditTrail'
import Backups          from './pages/Backups'
import Settings         from './pages/Settings'
import ManageUsers      from './pages/ManageUsers'
import Suppliers        from './pages/Suppliers'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route — no auth required */}
          <Route path="/login" element={<Login />} />

          {/* All authenticated routes share the AppShell layout (sidebar + topbar) */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }>
            {/* Default landing page */}
            <Route index element={<Dashboard />} />

            {/* Sales — requires sale.view permission */}
            <Route path="sales" element={
              <ProtectedRoute permission="sale.view">
                <Sales />
              </ProtectedRoute>
            } />
            
            {/* Customers — requires customer.manage permission */}
            <Route path="customers" element={
              <ProtectedRoute permission="customer.manage">
                <Customers />
              </ProtectedRoute>
            } />
            
            {/* Inventory — requires inventory.view permission */}
            <Route path="inventory" element={
              <ProtectedRoute permission="inventory.view">
                <Inventory />
              </ProtectedRoute>
            } />
            
             {/* Purchase Orders — requires po.view permission */}
             <Route path="purchase-orders" element={
               <ProtectedRoute permission="po.view">
                 <PurchaseOrders />
               </ProtectedRoute>
             } />
             
             {/* Suppliers — requires po.view permission */}
             <Route path="suppliers" element={
               <ProtectedRoute permission="po.view">
                 <Suppliers />
               </ProtectedRoute>
             } />
             
             {/* Receipts — requires receipt.issue permission */}
             <Route path="receipts" element={
               <ProtectedRoute permission="receipt.issue">
                 <Receipts />
               </ProtectedRoute>
             } />
             
             {/* Reports — requires report.view permission */}
             <Route path="reports" element={
               <ProtectedRoute permission="report.view">
                 <Reports />
               </ProtectedRoute>
             } />
             
             {/* Deliveries — requires delivery.view permission */}
             <Route path="deliveries" element={
               <ProtectedRoute permission="delivery.view">
                 <Deliveries />
               </ProtectedRoute>
             } />
            
            {/* Audit Trail — requires system.audit permission */}
            <Route path="system/audit" element={
              <ProtectedRoute permission="system.audit">
                <AuditTrail />
              </ProtectedRoute>
            } />
            
            {/* Backups — requires system.backup permission */}
            <Route path="system/backups" element={
              <ProtectedRoute permission="system.backup">
                <Backups />
              </ProtectedRoute>
            } />
            
            {/* Settings — requires system.config permission */}
            <Route path="settings" element={
              <ProtectedRoute permission="system.config">
                <Settings />
              </ProtectedRoute>
            } />
            
            {/* Manage Users — requires user.view permission */}
            <Route path="users" element={
              <ProtectedRoute permission="user.view">
                <ManageUsers />
              </ProtectedRoute>
            } />
            
            {/* 403 — Access Denied */}
            <Route path="403" element={
              <div className="text-center py-5">
                <h3>Access Denied</h3>
                <p>You do not have permission to view this page.</p>
              </div>
            } />
            
            {/* 404 catch-all — redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
