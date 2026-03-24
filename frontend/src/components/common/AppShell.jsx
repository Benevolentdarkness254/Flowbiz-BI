// frontend/src/components/common/AppShell.jsx
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'

/**
 * The main layout wrapper — sidebar on the left, page content on the right.
 * <Outlet /> is where React Router renders the current page component.
 */
export default function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        {/* Top navbar */}
        <nav className="navbar navbar-expand navbar-light bg-light px-4 border-bottom">
          <span className="ms-auto text-muted small me-3">{user?.full_name}</span>
          <button className="btn btn-sm btn-outline-secondary" onClick={logout}>
            Logout
          </button>
        </nav>
        {/* Page content */}
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}