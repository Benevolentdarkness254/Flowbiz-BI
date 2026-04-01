// frontend/src/components/common/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import { Nav }     from 'react-bootstrap'
import { usePermission } from '../../hooks/usePermission'
import { NAV_ITEMS }     from '../../nav.config'

/**
 * Sidebar navigation with icons and clear active-state indication.
 *
 * Active item styling:
 *   - Left accent border (3px solid)
 *   - Semi-transparent primary background
 *   - Bold text + full white color
 * Inactive item styling:
 *   - Muted text (white-50)
 *   - Transparent background
 *   - Hover shows subtle highlight
 */
export default function Sidebar() {
  const { can } = usePermission()

  // Filter nav items — only show what this user can access
  const visible = NAV_ITEMS.filter(item =>
    item.permission === null || can(item.permission)
  )

  return (
    <div className="sidebar d-flex flex-column p-3 bg-dark text-white"
         style={{ minHeight: '100vh', width: 220 }}>
      <div className="mb-4 fw-bold fs-5 px-2">Flowbiz</div>
      <Nav className="flex-column gap-1">
        {visible.map(item => (
          <Nav.Link
            as={NavLink}
            to={item.path}
            key={item.path}
            className={({ isActive }) =>
              `nav-link-custom d-flex align-items-center gap-2 px-3 py-2 rounded ${
                isActive
                  ? 'fw-bold text-white'
                  : 'text-white-50'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'rgba(13, 110, 253, 0.25)',
                    borderLeft: '3px solid #0d6efd',
                    transition: 'all 0.15s ease',
                  }
                : {
                    transition: 'all 0.15s ease',
                  }
            }
          >
            {/* Icon — rendered as inline SVG */}
            <span
              className="nav-icon"
              dangerouslySetInnerHTML={{ __html: item.icon || '' }}
            />
            {item.label}
          </Nav.Link>
        ))}
      </Nav>
    </div>
  )
}