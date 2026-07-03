import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { OptimisticGasto } from '../types/gasto'

interface GastosDataContextValue {
  refreshKey: number
  refresh: () => void
  optimisticGastos: OptimisticGasto[]
  addOptimisticGasto: (gasto: Omit<OptimisticGasto, 'tempId'>) => string
  removeOptimisticGasto: (tempId: string) => void
  removeOptimisticGastos: (tempIds: string[]) => void
}

const GastosDataContext = createContext<GastosDataContextValue | null>(null)

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

  const contextValue = useMemo(
    () => ({
      refreshKey,
      refresh,
      optimisticGastos,
      addOptimisticGasto,
      removeOptimisticGasto,
      removeOptimisticGastos,
    }),
    [
      refreshKey,
      refresh,
      optimisticGastos,
      addOptimisticGasto,
      removeOptimisticGasto,
      removeOptimisticGastos,
    ],
  )

  return (
    <GastosDataContext.Provider value={contextValue}>{children}</GastosDataContext.Provider>
  )
}

export function useGastosData() {
  const context = useContext(GastosDataContext)
  if (!context) {
    throw new Error('useGastosData debe usarse dentro de GastosDataProvider')
  }
  return context
}
