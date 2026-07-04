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
import type { PendingGasto } from '../types/gasto'
import { verificarGastosRecurrentes } from '../services/gastosRecurrentes'
import { syncPendingMetaAhorro } from '../services/metasAhorro'
import {
  getPendingGastos,
  getTotalPendingCount,
  remapPendingGastoCuentaIds,
} from '../services/offlineQueue'
import { syncPendingCuentas } from '../services/syncCuentas'
import { syncPendingGastos } from '../services/syncGastos'
import { isOnline } from '../utils/network'
import { showError, showInfo, showSuccess, showWarning } from '../utils/toast'
import { useAuthSession } from './AuthContext'
import { useGastosRefreshState, useOptimisticGastosState } from './GastosDataContext'

interface OfflineSyncStatusValue {
  isSyncing: boolean
  pendingCount: number
  pendingGastos: PendingGasto[]
}

interface OfflineSyncActionsValue {
  syncOffline: () => Promise<void>
}

const OfflineSyncStatusContext = createContext<OfflineSyncStatusValue | null>(null)
const OfflineSyncActionsContext = createContext<OfflineSyncActionsValue | null>(null)

interface OfflineSyncProviderProps {
  children: ReactNode
}

export function OfflineSyncProvider({ children }: OfflineSyncProviderProps) {
  const { user } = useAuthSession()
  const userRef = useRef(user)
  userRef.current = user

  const { refreshKey, refresh } = useGastosRefreshState()
  const { removeOptimisticGastos } = useOptimisticGastosState()
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingGastos, setPendingGastos] = useState<PendingGasto[]>([])

  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  const removeOptimisticRef = useRef(removeOptimisticGastos)
  removeOptimisticRef.current = removeOptimisticGastos

  const updatePendingCount = useCallback(async () => {
    const [gastos, total] = await Promise.all([
      getPendingGastos(),
      getTotalPendingCount(),
    ])
    setPendingGastos(gastos)
    setPendingCount(total)
  }, [])

  const syncRecurring = useCallback(async (userId: string) => {
    if (!isOnline()) return 0

    const registered = await verificarGastosRecurrentes(userId)
    if (registered > 0) {
      showSuccess(`${registered} gasto(s) recurrente(s) registrado(s) automáticamente.`)
      refreshRef.current()
    }
    return registered
  }, [])

  const syncOffline = useCallback(async () => {
    const currentUser = userRef.current
    if (!currentUser || !isOnline()) return

    const totalBefore = await getTotalPendingCount()
    const hadPending = totalBefore > 0

    setIsSyncing(true)
    if (hadPending) {
      showInfo('Sincronizando cambios guardados offline...')
    }

    try {
      const cuentasResult = await syncPendingCuentas(currentUser.id)
      if (Object.keys(cuentasResult.idMap).length > 0) {
        await remapPendingGastoCuentaIds(cuentasResult.idMap)
      }

      if (cuentasResult.synced > 0) {
        showSuccess(`${cuentasResult.synced} cuenta(s) sincronizada(s) desde modo offline.`)
        refreshRef.current()
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
        removeOptimisticRef.current(result.optimisticTempIdsRemoved)
      }

      if (result.synced > 0) {
        showSuccess(`${result.synced} gasto(s) sincronizado(s) desde modo offline.`)
        refreshRef.current()
      }

      if (result.discarded > 0) {
        showError(
          `${result.discarded} gasto(s) no se pudieron sincronizar y se descartaron de la cola.`,
        )
      } else if (result.failures.length > 0) {
        showWarning('Algunos gastos offline fallaron y se reintentarán.')
      }

      const metaSynced = await syncPendingMetaAhorro(currentUser.id)
      if (metaSynced > 0) refreshRef.current()
      await syncRecurring(currentUser.id)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error inesperado al sincronizar datos offline.'
      showError(message)
      await updatePendingCount()
    } finally {
      setIsSyncing(false)
    }
  }, [updatePendingCount, syncRecurring])

  const syncOfflineRef = useRef(syncOffline)
  syncOfflineRef.current = syncOffline

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function initializeSync() {
      await updatePendingCount()
      await syncOfflineRef.current()
      if (cancelled || !userRef.current || !isOnline()) return

      const metaSynced = await syncPendingMetaAhorro(userRef.current.id)
      if (metaSynced > 0) refreshRef.current()
      await syncRecurring(userRef.current.id)
    }

    initializeSync()

    return () => {
      cancelled = true
    }
  }, [user, updatePendingCount, syncRecurring])

  useEffect(() => {
    const onOnline = () => {
      void syncOfflineRef.current().then(async () => {
        const currentUser = userRef.current
        if (!currentUser) return
        const metaSynced = await syncPendingMetaAhorro(currentUser.id)
        if (metaSynced > 0) refreshRef.current()
        await syncRecurring(currentUser.id)
      })
    }

    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [syncRecurring])

  useEffect(() => {
    if (user) updatePendingCount()
  }, [user, refreshKey, updatePendingCount])

  const statusValue = useMemo(
    () => ({ isSyncing, pendingCount, pendingGastos }),
    [isSyncing, pendingCount, pendingGastos],
  )

  const actionsValue = useMemo(() => ({ syncOffline }), [syncOffline])

  return (
    <OfflineSyncStatusContext.Provider value={statusValue}>
      <OfflineSyncActionsContext.Provider value={actionsValue}>
        {children}
      </OfflineSyncActionsContext.Provider>
    </OfflineSyncStatusContext.Provider>
  )
}

export function useOfflineSyncStatus() {
  const context = useContext(OfflineSyncStatusContext)
  if (!context) {
    throw new Error('useOfflineSyncStatus debe usarse dentro de OfflineSyncProvider')
  }
  return context
}

export function useOfflineSyncActions() {
  const context = useContext(OfflineSyncActionsContext)
  if (!context) {
    throw new Error('useOfflineSyncActions debe usarse dentro de OfflineSyncProvider')
  }
  return context
}
