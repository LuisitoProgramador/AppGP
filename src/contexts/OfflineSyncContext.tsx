import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { PendingCuenta } from '../types/cuenta'
import type { PendingGasto } from '../types/gasto'
import { verificarGastosRecurrentes } from '../services/gastosRecurrentes'
import { syncPendingMetaAhorro } from '../services/metasAhorro'
import {
  getPendingCuentas,
  getPendingGastos,
  getTotalPendingCount,
  remapPendingGastoCuentaIds,
} from '../services/offlineQueue'
import { syncPendingCuentas } from '../services/syncCuentas'
import { syncPendingGastos } from '../services/syncGastos'
import { isOnline } from '../utils/network'
import { showError, showInfo, showSuccess, showWarning } from '../utils/toast'
import { useAuthContext } from './AuthContext'
import { useGastosData } from './GastosDataContext'

interface OfflineSyncContextValue {
  isSyncing: boolean
  pendingCount: number
  pendingGastos: PendingGasto[]
  pendingCuentas: PendingCuenta[]
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
  const [pendingCuentas, setPendingCuentas] = useState<PendingCuenta[]>([])

  const updatePendingCount = useCallback(async () => {
    const [gastos, cuentas, total] = await Promise.all([
      getPendingGastos(),
      getPendingCuentas(),
      getTotalPendingCount(),
    ])
    setPendingGastos(gastos)
    setPendingCuentas(cuentas)
    setPendingCount(total)
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

    const totalBefore = await getTotalPendingCount()
    const hadPending = totalBefore > 0

    setIsSyncing(true)
    if (hadPending) {
      showInfo('Sincronizando cambios guardados offline...')
    }

    try {
      const cuentasResult = await syncPendingCuentas(user.id)
      if (Object.keys(cuentasResult.idMap).length > 0) {
        await remapPendingGastoCuentaIds(cuentasResult.idMap)
      }

      if (cuentasResult.synced > 0) {
        showSuccess(`${cuentasResult.synced} cuenta(s) sincronizada(s) desde modo offline.`)
        refresh()
      }

      if (cuentasResult.discarded > 0) {
        showError(
          `${cuentasResult.discarded} cuenta(s) no se pudieron sincronizar y se descartaron de la cola.`,
        )
      } else if (cuentasResult.failures.length > 0) {
        showWarning('Algunas cuentas offline fallaron y se reintentarán.')
      }

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
        err instanceof Error ? err.message : 'Error inesperado al sincronizar datos offline.'
      showError(message)
      await updatePendingCount()
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
      pendingCuentas,
      syncOffline,
    }),
    [isSyncing, pendingCount, pendingGastos, pendingCuentas, syncOffline],
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
