// frontend/src/components/common/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import { Nav }     from 'react-bootstrap'
import { usePermission } from '../../hooks/usePermission'
import { NAV_ITEMS }     from '../../nav.config'

export default function Sidebar() {
  const { can } = usePermission()

  const visible = NAV_ITEMS.filter(item =>
    item.permission === null || can(item.permission)
  )

  return (
    <div className="sidebar d-flex flex-column p-3"
         style={{ minHeight: '100vh', width: 240, background: '#0f172a' }}>
      <div className="sidebar-brand mb-4 px-2 d-flex align-items-center gap-2"
           style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <span>Flowbiz</span>
      </div>
      <Nav className="flex-column gap-1 flex-grow-1">
        {visible.map(item => (
          <Nav.Link
            as={NavLink}
            to={item.path}
            key={item.path}
            className={({ isActive }) =>
              `sidebar-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 ${
                isActive ? 'active' : ''
              }`
            }
          >
            <span className="sidebar-icon">
              <span dangerouslySetInnerHTML={{ __html: item.icon || '' }} />
            </span>
            <span className="sidebar-label">{item.label}</span>
          </Nav.Link>
        ))}
      </Nav>
      <style>{`
        .sidebar-link {
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s ease;
          position: relative;
          margin-left: 4px;
          padding-left: 14px !important;
          border-radius: 8px !important;
        }
        .sidebar-link::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 0;
          background: #3b82f6;
          border-radius: 2px;
          transition: height 0.2s ease;
        }
        .sidebar-link:hover {
          color: #cbd5e1;
          background: rgba(255, 255, 255, 0.04);
        }
        .sidebar-link:hover::before {
          height: 40%;
        }
        .sidebar-link.active {
          color: #fff;
          background: #3b82f6;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .sidebar-link.active::before {
          height: 60%;
          background: #fff;
        }
        .sidebar-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .sidebar-icon svg {
          width: 20px;
          height: 20px;
        }
        .sidebar-link.active .sidebar-icon svg {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
        }
        .sidebar-label {
          white-space: nowrap;
        }
      `}</style>
    </div>
  )
}