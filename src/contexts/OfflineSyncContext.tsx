import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { PendingGasto } from '../types/gasto'
import { verificarGastosRecurrentes } from '../services/gastosRecurrentes'
import { syncPendingMetaAhorro } from '../services/metasAhorro'
import { getPendingGastos } from '../services/offlineQueue'
import { syncPendingGastos } from '../services/syncGastos'
import { isOnline } from '../utils/network'
import { showError, showSuccess, showWarning } from '../utils/toast'
import { useAuthContext } from './AuthContext'
import { useGastosData } from './GastosDataContext'

interface OfflineSyncContextValue {
  isSyncing: boolean
  pendingCount: number
  pendingGastos: PendingGasto[]
  syncOffline: () => Promise<void>
}

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null)

interface OfflineSyncProviderProps {
  children: ReactNode
}

export function OfflineSyncProvider({ children }: OfflineSyncProviderProps) {
  const { user } = useAuthContext()
  const { refreshKey, refresh, removeOptimisticGastos } = useGastosData()
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingGastos, setPendingGastos] = useState<PendingGasto[]>([])

  const updatePendingCount = useCallback(async () => {
    const pending = await getPendingGastos()
    setPendingCount(pending.length)
    setPendingGastos(pending)
  }, [])

  const syncRecurring = useCallback(async () => {
    if (!user || !isOnline()) return 0

    const registered = await verificarGastosRecurrentes(user.id)
    if (registered > 0) {
      showSuccess(`${registered} gasto(s) recurrente(s) registrado(s) automáticamente.`)
      refresh()
    }
    return registered
  }, [user, refresh])

  const syncOffline = useCallback(async () => {
    if (!user || !isOnline()) return

    setIsSyncing(true)
    try {
      const result = await syncPendingGastos()
      await updatePendingCount()

      if (result.optimisticTempIdsRemoved.length > 0) {
        removeOptimisticGastos(result.optimisticTempIdsRemoved)
      }

      if (result.synced > 0) {
        showSuccess(`${result.synced} gasto(s) sincronizado(s) desde modo offline.`)
        refresh()
      }

      if (result.discarded > 0) {
        showError(
          `${result.discarded} gasto(s) no se pudieron sincronizar y se descartaron de la cola.`,
        )
      } else if (result.failures.length > 0) {
        showWarning('Algunos gastos offline fallaron y se reintentarán.')
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error inesperado al sincronizar gastos offline.'
      showError(message)
    } finally {
      setIsSyncing(false)
    }
  }, [user, refresh, updatePendingCount, removeOptimisticGastos])

  useEffect(() => {
    if (!user) return

    async function initializeSync() {
      await updatePendingCount()
      await syncOffline()
      if (user && isOnline()) {
        const metaSynced = await syncPendingMetaAhorro(user.id)
        if (metaSynced > 0) refresh()
      }
      await syncRecurring()
    }

    initializeSync()

    const onOnline = () => {
      syncOffline().then(async () => {
        if (user) {
          const metaSynced = await syncPendingMetaAhorro(user.id)
          if (metaSynced > 0) refresh()
        }
        await syncRecurring()
      })
    }

    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [user, syncOffline, syncRecurring, updatePendingCount, refresh])

  useEffect(() => {
    if (user) updatePendingCount()
  }, [user, refreshKey, updatePendingCount])

  const contextValue = useMemo(
    () => ({
      isSyncing,
      pendingCount,
      pendingGastos,
      syncOffline,
    }),
    [isSyncing, pendingCount, pendingGastos, syncOffline],
  )

  return (
    <OfflineSyncContext.Provider value={contextValue}>{children}</OfflineSyncContext.Provider>
  )
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext)
  if (!context) {
    throw new Error('useOfflineSync debe usarse dentro de OfflineSyncProvider')
  }
  return context
}
