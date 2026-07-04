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
import type { PendingIngreso } from '../types/ingreso'
import { verificarGastosRecurrentes } from '../services/gastosRecurrentes'
import { syncPendingMetaAhorro } from '../services/metasAhorro'
import {
  getPendingGastos,
  getPendingIngresos,
  getTotalPendingCount,
  remapPendingGastoCuentaIds,
} from '../services/offlineQueue'
import { syncPendingCuentas } from '../services/syncCuentas'
import { syncPendingGastos } from '../services/syncGastos'
import { syncPendingIngresos } from '../services/syncIngresos'
import { isOnline } from '../utils/network'
import { showError, showSuccess, showWarning } from '../utils/toast'
import { useAuthSession } from './AuthContext'
import { useGastosRefreshState, useOptimisticGastosState } from './GastosDataContext'

interface OfflineSyncStatusValue {
  isSyncing: boolean
  pendingCount: number
  pendingGastos: PendingGasto[]
  pendingIngresos: PendingIngreso[]
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
  const [pendingIngresos, setPendingIngresos] = useState<PendingIngreso[]>([])
  const syncInProgressRef = useRef(false)

  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  const removeOptimisticRef = useRef(removeOptimisticGastos)
  removeOptimisticRef.current = removeOptimisticGastos

  const updatePendingCount = useCallback(async (userId: string) => {
    const [gastos, ingresos, total] = await Promise.all([
      getPendingGastos(userId),
      getPendingIngresos(userId),
      getTotalPendingCount(userId),
    ])
    setPendingGastos(gastos)
    setPendingIngresos(ingresos)
    setPendingCount(total)
  }, [])

  const syncRecurring = useCallback(async (userId: string) => {
    if (!isOnline()) return 0

    const registered = await verificarGastosRecurrentes(userId)
    if (registered > 0) {
      refreshRef.current()
    }
    return registered
  }, [])

  const syncOffline = useCallback(async () => {
    const currentUser = userRef.current
    if (!currentUser || !isOnline() || syncInProgressRef.current) return

    syncInProgressRef.current = true
    const successMessages: string[] = []
    const warningMessages: string[] = []
    const errorMessages: string[] = []

    setIsSyncing(true)

    try {
      const cuentasResult = await syncPendingCuentas(currentUser.id)
      if (Object.keys(cuentasResult.idMap).length > 0) {
        await remapPendingGastoCuentaIds(currentUser.id, cuentasResult.idMap)
      }

      if (cuentasResult.synced > 0) {
        successMessages.push(`${cuentasResult.synced} cuenta(s) sincronizada(s) desde modo offline`)
        refreshRef.current()
      }

      if (cuentasResult.discarded > 0) {
        errorMessages.push(
          `${cuentasResult.discarded} cuenta(s) no se pudieron sincronizar y se descartaron de la cola`,
        )
      } else if (cuentasResult.failures.length > 0) {
        warningMessages.push('Algunas cuentas offline fallaron y se reintentarán')
      }

      const result = await syncPendingGastos(currentUser.id)
      await updatePendingCount(currentUser.id)

      if (result.optimisticTempIdsRemoved.length > 0) {
        removeOptimisticRef.current(result.optimisticTempIdsRemoved)
      }

      if (result.synced > 0) {
        successMessages.push(`${result.synced} gasto(s) sincronizado(s) desde modo offline`)
        refreshRef.current()
      }

      if (result.discarded > 0) {
        errorMessages.push(
          `${result.discarded} gasto(s) no se pudieron sincronizar y se descartaron de la cola`,
        )
      } else if (result.failures.length > 0) {
        warningMessages.push('Algunos gastos offline fallaron y se reintentarán')
      }

      const ingresosResult = await syncPendingIngresos(currentUser.id)
      await updatePendingCount(currentUser.id)

      if (ingresosResult.synced > 0) {
        successMessages.push(`${ingresosResult.synced} ingreso(s) sincronizado(s) desde modo offline`)
        refreshRef.current()
      }

      if (ingresosResult.discarded > 0) {
        errorMessages.push(
          `${ingresosResult.discarded} ingreso(s) no se pudieron sincronizar y se descartaron de la cola`,
        )
      } else if (ingresosResult.failures.length > 0) {
        warningMessages.push('Algunos ingresos offline fallaron y se reintentarán')
      }

      const metaSynced = await syncPendingMetaAhorro(currentUser.id)
      if (metaSynced > 0) refreshRef.current()

      const recurringRegistered = await syncRecurring(currentUser.id)
      if (recurringRegistered > 0) {
        successMessages.push(
          `${recurringRegistered} gasto(s) recurrente(s) registrado(s) automáticamente`,
        )
      }

      if (successMessages.length > 0) {
        showSuccess(`${successMessages.join('. ')}.`)
      }
      if (warningMessages.length > 0) {
        showWarning(`${warningMessages.join('. ')}.`)
      }
      if (errorMessages.length > 0) {
        showError(`${errorMessages.join('. ')}.`)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error inesperado al sincronizar datos offline.'
      showError(message)
      await updatePendingCount(currentUser.id)
    } finally {
      setIsSyncing(false)
      syncInProgressRef.current = false
    }
  }, [updatePendingCount, syncRecurring])

  const syncOfflineRef = useRef(syncOffline)
  syncOfflineRef.current = syncOffline

  useEffect(() => {
    if (!user) {
      setPendingGastos([])
      setPendingIngresos([])
      setPendingCount(0)
      return
    }

    const userId = user.id
    let cancelled = false

    async function initializeSync() {
      await updatePendingCount(userId)
      if (cancelled) return
      await syncOfflineRef.current()
    }

    initializeSync()

    return () => {
      cancelled = true
    }
  }, [user, updatePendingCount])

  useEffect(() => {
    const onOnline = () => {
      void syncOfflineRef.current()
    }

    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  useEffect(() => {
    if (user) updatePendingCount(user.id)
  }, [user, refreshKey, updatePendingCount])

  const statusValue = useMemo(
    () => ({ isSyncing, pendingCount, pendingGastos, pendingIngresos }),
    [isSyncing, pendingCount, pendingGastos, pendingIngresos],
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
