// frontend/src/hooks/usePermission.js
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * The central hook for all permission checks in the UI.
 *
 * Usage:
 *   const { can } = usePermission()
 *   if (can('po.approve')) { ... }
 *
 * Why permission keys and not role names?
 * Checking role names couples the UI to the role structure.
 * If a business owner role is renamed, or a sales manager role is added
 * that should also see reports, you have to change UI code.
 * Permission keys never change — only role-to-permission mappings change,
 * and those live in the database.
 *
 * System administrators implicitly have ALL permissions — this is enforced
 * here so the UI renders correctly for them without needing every permission
 * explicitly assigned in the database.
 */
export function usePermission() {
  const { user, permissions } = useContext(AuthContext)
  const isSystemAdmin = user?.role === 'system_admin'

  return {
    // check one permission — system admins always pass
    can:    (key)  => isSystemAdmin || permissions.includes(key),
    // check if user has ANY of the listed permissions
    canAny: (keys) => isSystemAdmin || keys.some(k => permissions.includes(k)),
    // check if user has ALL of the listed permissions
    canAll: (keys) => isSystemAdmin || keys.every(k => permissions.includes(k)),
  }
}