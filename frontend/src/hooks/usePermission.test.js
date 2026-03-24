// frontend/src/hooks/usePermission.test.js
import { renderHook } from '@testing-library/react'
import { AuthContext } from '../context/AuthContext'
import { usePermission } from './usePermissions'

const wrapper = ({ children, permissions }) => (
  <AuthContext.Provider value={{ permissions, user: null, loading: false }}>
    {children}
  </AuthContext.Provider>
)

test('can() returns true when permission exists', () => {
  const { result } = renderHook(() => usePermission(), {
    wrapper: ({ children }) => wrapper({ children, permissions: ['sale.view', 'po.approve'] })
  })
  expect(result.current.can('sale.view')).toBe(true)
  expect(result.current.can('user.create')).toBe(false)
})

test('canAny() returns true when at least one permission exists', () => {
  const { result } = renderHook(() => usePermission(), {
    wrapper: ({ children }) => wrapper({ children, permissions: ['sale.view'] })
  })
  expect(result.current.canAny(['sale.view', 'report.view'])).toBe(true)
  expect(result.current.canAny(['report.view', 'system.config'])).toBe(false)
})