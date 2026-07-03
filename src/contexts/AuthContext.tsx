import { createContext, useContext, type ReactNode } from 'react'
import useAuth from '../hooks/useAuth'

type AuthContextValue = ReturnType<typeof useAuth>

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth()

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext debe usarse dentro de AuthProvider')
  }
  return context
}
