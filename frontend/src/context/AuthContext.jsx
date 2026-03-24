// frontend/src/context/AuthContext.jsx
import { createContext, useState, useEffect, useContext } from 'react'
import { authApi } from '../api/auth'

/**
 * AuthContext provides the current user and their permissions to the entire app.
 * Any component can read permissions without prop-drilling.
 *
 * How it works:
 * 1. On first render, call /api/auth/me — if the JWT cookie exists, Flask
 *    returns the user profile and permissions.
 * 2. Store user and permissions in state.
 * 3. All child components read from context — no prop threading needed.
 */
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [permissions, setPermissions] = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    authApi.me()
      .then(res => {
        setUser(res.data.user)
        setPermissions(res.data.permissions)
      })
      .catch(() => {
        // 401 — no valid session, user stays null
        setUser(null)
        setPermissions([])
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const res = await authApi.login(username, password)
    setUser(res.data.user)
    setPermissions(res.data.user.permissions)
    return res.data.user
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
    setPermissions([])
  }

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout }}>
      {/* Don't render anything until we know if the user is logged in.
          This prevents a flash of the login page for authenticated users. */}
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)