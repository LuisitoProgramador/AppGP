import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { OptimisticGasto } from '../types/gasto'

interface GastosRefreshContextValue {
  refreshKey: number
  refresh: () => void
}

interface OptimisticGastosContextValue {
  optimisticGastos: OptimisticGasto[]
  addOptimisticGasto: (gasto: Omit<OptimisticGasto, 'tempId'>) => string
  removeOptimisticGasto: (tempId: string) => void
  removeOptimisticGastos: (tempIds: string[]) => void
}

const GastosRefreshContext = createContext<GastosRefreshContextValue | null>(null)
const OptimisticGastosContext = createContext<OptimisticGastosContextValue | null>(null)

interface GastosDataProviderProps {
  children: ReactNode
}

export function GastosDataProvider({ children }: GastosDataProviderProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [optimisticGastos, setOptimisticGastos] = useState<OptimisticGasto[]>([])

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1)
  }, [])

  const addOptimisticGasto = useCallback((gasto: Omit<OptimisticGasto, 'tempId'>) => {
    const tempId = crypto.randomUUID()
    setOptimisticGastos((current) => [{ ...gasto, tempId }, ...current])
    return tempId
  }, [])

  const removeOptimisticGasto = useCallback((tempId: string) => {
    setOptimisticGastos((current) => current.filter((gasto) => gasto.tempId !== tempId))
  }, [])

  const removeOptimisticGastos = useCallback((tempIds: string[]) => {
    const ids = new Set(tempIds)
    setOptimisticGastos((current) => current.filter((gasto) => !ids.has(gasto.tempId)))
  }, [])

  const refreshValue = useMemo(
    () => ({ refreshKey, refresh }),
    [refreshKey, refresh],
  )

  const optimisticValue = useMemo(
    () => ({
      optimisticGastos,
      addOptimisticGasto,
      removeOptimisticGasto,
      removeOptimisticGastos,
    }),
    [optimisticGastos, addOptimisticGasto, removeOptimisticGasto, removeOptimisticGastos],
  )

  return (
    <GastosRefreshContext.Provider value={refreshValue}>
      <OptimisticGastosContext.Provider value={optimisticValue}>
        {children}
      </OptimisticGastosContext.Provider>
    </GastosRefreshContext.Provider>
  )
}

export function useGastosRefreshState() {
  const context = useContext(GastosRefreshContext)
  if (!context) {
    throw new Error('useGastosRefreshState debe usarse dentro de GastosDataProvider')
  }
  return context
}

export function useOptimisticGastosState() {
  const context = useContext(OptimisticGastosContext)
  if (!context) {
    throw new Error('useOptimisticGastosState debe usarse dentro de GastosDataProvider')
  }
  return context
}

/** Hook completo — preferir useGastosRefreshState o useOptimisticGastosState según necesidad. */
export function useGastosData() {
  return { ...useGastosRefreshState(), ...useOptimisticGastosState() }
}
