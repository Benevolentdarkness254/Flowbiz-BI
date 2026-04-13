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
 * Note: All users including system_admin must have permissions explicitly
 * assigned in the database. There is no implicit full access for any role.
 */
export function usePermission() {
  const { permissions } = useContext(AuthContext)

  return {
    can: (key) => permissions.includes(key),
    canAny: (keys) => keys.some(k => permissions.includes(k)),
    canAll: (keys) => keys.every(k => permissions.includes(k)),
  }
}