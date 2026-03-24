// frontend/src/components/common/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePermission } from '../../hooks/usePermissions'

/**
 * Wraps a route. If no user, redirects to /login.
 * If a permission is required and the user lacks it, redirects to /403.
 * Usage: <ProtectedRoute permission="report.view"><Reports /></ProtectedRoute>
 */
export default function ProtectedRoute({ permission, children }) {
  const { user }  = useAuth()
  const { can }   = usePermission()

  if (!user)                          return <Navigate to="/login"  replace />
  if (permission && !can(permission)) return <Navigate to="/403"    replace />
  return children
}