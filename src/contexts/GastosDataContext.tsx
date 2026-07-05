import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { OptimisticGasto } from '../types/gasto'
import { invalidateAppQueries } from '../lib/invalidateAppQueries'

type RefreshListener = () => void
const refreshListeners = new Set<RefreshListener>()

interface GastosRefreshContextValue {
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
  const [optimisticGastos, setOptimisticGastos] = useState<OptimisticGasto[]>([])

  const refresh = useCallback(() => {
    invalidateAppQueries()
    refreshListeners.forEach((listener) => listener())
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

  const refreshValue = useMemo(() => ({ refresh }), [refresh])

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

/** Re-ejecuta un efecto cuando refresh() invalida la caché (sin refreshKey en queryKey). */
export function useOnAppRefresh(listener: RefreshListener): void {
  const listenerRef = useRef(listener)
  listenerRef.current = listener

  useEffect(() => {
    const wrapped = () => listenerRef.current()
    refreshListeners.add(wrapped)
    return () => {
      refreshListeners.delete(wrapped)
    }
  }, [])
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
