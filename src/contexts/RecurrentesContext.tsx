import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { listGastosRecurrentes } from '../services/gastos/gastosRecurrentes'
import type { GastoRecurrente } from '../types/gasto'
import { queryKeys } from '../lib/queryKeys'
import { useAuthSession } from './AuthContext'

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

  const query = useQuery({
    queryKey: queryKeys.recurrentes(user?.id),
    queryFn: async () => {
      const { data, error: listError } = await listGastosRecurrentes(user!.id)
      if (listError) throw new Error(listError)
      return data
    },
    enabled: Boolean(user),
  })

  const reload = useCallback(async () => {
    await query.refetch()
  }, [query])

  const value = useMemo(
    () => ({
      recurrentes: query.data ?? [],
      cargando: query.isLoading,
      error: query.error ? (query.error as Error).message : null,
      reload,
    }),
    [query.data, query.isLoading, query.error, reload],
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
