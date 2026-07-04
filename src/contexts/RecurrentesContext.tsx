import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { listGastosRecurrentes } from '../services/gastosRecurrentes'
import type { GastoRecurrente } from '../types/gasto'
import { useAuthSession } from './AuthContext'
import { useGastosRefreshState } from './GastosDataContext'

interface RecurrentesContextValue {
  recurrentes: GastoRecurrente[]
  cargando: boolean
  error: string | null
  reload: () => Promise<void>
}

const RecurrentesContext = createContext<RecurrentesContextValue | null>(null)

interface RecurrentesProviderProps {
  children: ReactNode
}

export function RecurrentesProvider({ children }: RecurrentesProviderProps) {
  const { user } = useAuthSession()
  const { refreshKey } = useGastosRefreshState()
  const [recurrentes, setRecurrentes] = useState<GastoRecurrente[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) {
      setRecurrentes([])
      setError(null)
      setCargando(false)
      return
    }

    setCargando(true)
    setError(null)

    const { data, error: listError } = await listGastosRecurrentes(user.id)
    setRecurrentes(data)
    setError(listError)
    setCargando(false)
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload, refreshKey])

  const value = useMemo(
    () => ({ recurrentes, cargando, error, reload }),
    [recurrentes, cargando, error, reload],
  )

  return <RecurrentesContext.Provider value={value}>{children}</RecurrentesContext.Provider>
}

export function useRecurrentes() {
  const context = useContext(RecurrentesContext)
  if (!context) {
    throw new Error('useRecurrentes debe usarse dentro de RecurrentesProvider')
  }
  return context
}
