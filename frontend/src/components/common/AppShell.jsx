// frontend/src/components/common/AppShell.jsx
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'

export default function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="app-layout">
      <div className="app-sidebar">
        <Sidebar />
      </div>
      <div className="app-main">
        <nav className="app-topbar navbar navbar-expand navbar-light px-4 border-bottom">
          <span className="ms-auto text-muted small me-3">{user?.full_name}</span>
          <button className="btn btn-sm btn-outline-secondary" onClick={logout}>
            Logout
          </button>
        </nav>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <style>{`
        .app-layout {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }
        .app-sidebar {
          flex-shrink: 0;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .app-sidebar::-webkit-scrollbar {
          width: 4px;
        }
        .app-sidebar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
        }
        .app-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          height: 100vh;
        }
        .app-topbar {
          flex-shrink: 0;
        }
        .app-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }
        .app-content::-webkit-scrollbar {
          width: 6px;
        }
        .app-content::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}