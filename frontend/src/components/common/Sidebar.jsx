// frontend/src/components/common/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import { Nav }     from 'react-bootstrap'
import { usePermission } from '../../hooks/usePermissions'
import { NAV_ITEMS }     from '../../nav.config'

export default function Sidebar() {
  const { can } = usePermission()

  // Filter nav items — only show what this user can access
  const visible = NAV_ITEMS.filter(item =>
    item.permission === null || can(item.permission)
  )

  return (
    <div className="sidebar d-flex flex-column p-3 bg-dark text-white"
         style={{ minHeight: '100vh', width: 220 }}>
      <div className="mb-4 fw-bold fs-5">Flowbiz</div>
      <Nav className="flex-column gap-1">
        {visible.map(item => (
          <Nav.Link
            as={NavLink}
            to={item.path}
            key={item.path}
            className={({ isActive }) =>
              `text-white rounded px-3 py-2 ${isActive ? 'bg-primary' : 'text-white-50'}`
            }
          >
            {item.label}
          </Nav.Link>
        ))}
      </Nav>
    </div>
  )
}