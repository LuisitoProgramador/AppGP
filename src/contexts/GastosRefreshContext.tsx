import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getPendingGastos } from '../services/offlineQueue'
import { syncPendingGastos } from '../services/syncGastos'
import { showError, showSuccess, showWarning } from '../utils/toast'
import { useAuthContext } from './AuthContext'

interface GastosRefreshContextValue {
  refreshKey: number
  refresh: () => void
  isSyncing: boolean
  pendingCount: number
  syncOffline: () => Promise<void>
}

const GastosRefreshContext = createContext<GastosRefreshContextValue | null>(null)

interface GastosRefreshProviderProps {
  children: ReactNode
}

export function GastosRefreshProvider({ children }: GastosRefreshProviderProps) {
  const { user } = useAuthContext()
  const [refreshKey, setRefreshKey] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1)
  }, [])

  const updatePendingCount = useCallback(async () => {
    const pending = await getPendingGastos()
    setPendingCount(pending.length)
  }, [])

  const syncOffline = useCallback(async () => {
    if (!user || !navigator.onLine) return

    setIsSyncing(true)
    try {
      const result = await syncPendingGastos()
      await updatePendingCount()

      if (result.synced > 0) {
        showSuccess(
          `${result.synced} gasto(s) sincronizado(s) desde modo offline.`,
        )
        refresh()
      }

      if (result.discarded > 0) {
        showError(
          `${result.discarded} gasto(s) no se pudieron sincronizar y se descartaron de la cola.`,
        )
      } else if (result.failures.length > 0) {
        showWarning('Algunos gastos offline fallaron y se reintentarán.')
      }
    } finally {
      setIsSyncing(false)
    }
  }, [user, refresh, updatePendingCount])

  useEffect(() => {
    if (!user) return
    updatePendingCount()
    syncOffline()

    const onOnline = () => {
      syncOffline()
    }

    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [user, syncOffline, updatePendingCount])

  useEffect(() => {
    if (user) updatePendingCount()
  }, [user, refreshKey, updatePendingCount])

  return (
    <GastosRefreshContext.Provider
      value={{ refreshKey, refresh, isSyncing, pendingCount, syncOffline }}
    >
      {children}
    </GastosRefreshContext.Provider>
  )
}

export function useGastosRefresh() {
  const context = useContext(GastosRefreshContext)
  if (!context) {
    throw new Error('useGastosRefresh debe usarse dentro de GastosRefreshProvider')
  }
  return context
}
