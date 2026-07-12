// Holds login state for the whole app and shares it through React context.
// The JWT is kept in localStorage so a page refresh keeps you signed in. Any component
// can read/act on auth via the useAuth() hook (isAuthenticated, login, logout).
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { login as apiLogin, setAuthToken, setUnauthorizedHandler, TOKEN_KEY } from './api'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // On first render, restore any token saved from a previous session.
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  const logout = () => {
    setAuthToken(null)
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }

  // Log out automatically if any request comes back 401.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = async (username: string, password: string) => {
    const t = await apiLogin(username, password)
    setAuthToken(t)
    localStorage.setItem(TOKEN_KEY, t)
    setToken(t)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
