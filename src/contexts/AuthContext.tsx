import { createContext, useContext, useMemo, type ReactNode } from 'react'
import useAuth from '../hooks/useAuth'

interface AuthSessionValue {
  session: ReturnType<typeof useAuth>['session']
  user: ReturnType<typeof useAuth>['user']
  loading: boolean
}

interface AuthActionsValue {
  signIn: ReturnType<typeof useAuth>['signIn']
  signUp: ReturnType<typeof useAuth>['signUp']
  signOut: ReturnType<typeof useAuth>['signOut']
  resetPassword: ReturnType<typeof useAuth>['resetPassword']
}

const AuthSessionContext = createContext<AuthSessionValue | null>(null)
const AuthActionsContext = createContext<AuthActionsValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { session, user, loading, signIn, signUp, signOut, resetPassword } = useAuth()

  const sessionValue = useMemo(
    () => ({ session, user, loading }),
    [session, user, loading],
  )

  const actionsValue = useMemo(
    () => ({ signIn, signUp, signOut, resetPassword }),
    [signIn, signUp, signOut, resetPassword],
  )

  return (
    <AuthSessionContext.Provider value={sessionValue}>
      <AuthActionsContext.Provider value={actionsValue}>{children}</AuthActionsContext.Provider>
    </AuthSessionContext.Provider>
  )
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext)
  if (!context) {
    throw new Error('useAuthSession debe usarse dentro de AuthProvider')
  }
  return context
}

export function useAuthActions() {
  const context = useContext(AuthActionsContext)
  if (!context) {
    throw new Error('useAuthActions debe usarse dentro de AuthProvider')
  }
  return context
}
