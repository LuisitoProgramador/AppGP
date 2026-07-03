import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { OptimisticGasto, PendingGasto } from '../types/gasto'
import type { Cuenta } from '../types/cuenta'
import { ensureCuentaEfectivo, listCuentas, applyGastoSaldoLocal, persistCuentaSaldo, revertGastoSaldoLocal, resolveCuentasBase, setCachedCuentas } from '../services/cuentas'
import { verificarGastosRecurrentes } from '../services/gastosRecurrentes'
import { syncPendingMetaAhorro } from '../services/metasAhorro'
import { getPendingGastos } from '../services/offlineQueue'
import { syncPendingGastos } from '../services/syncGastos'
import { showError, showSuccess, showWarning } from '../utils/toast'
import { useAuthContext } from './AuthContext'

interface GastosRefreshContextValue {
  refreshKey: number
  refresh: () => void
  isSyncing: boolean
  pendingCount: number
  pendingGastos: PendingGasto[]
  optimisticGastos: OptimisticGasto[]
  addOptimisticGasto: (gasto: Omit<OptimisticGasto, 'tempId'>) => string
  removeOptimisticGasto: (tempId: string) => void
  removeOptimisticGastos: (tempIds: string[]) => void
  syncOffline: () => Promise<void>
  cuentas: Cuenta[]
  cuentasLoading: boolean
  refreshCuentas: () => Promise<void>
  applyGastoSaldo: (cuentaId: string, monto: number) => Promise<{ error: string | null }>
  revertGastoSaldo: (cuentaId: string, monto: number) => Promise<{ error: string | null }>
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
  const [pendingGastos, setPendingGastos] = useState<PendingGasto[]>([])
  const [optimisticGastos, setOptimisticGastos] = useState<OptimisticGasto[]>([])
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [cuentasLoading, setCuentasLoading] = useState(true)

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1)
  }, [])

  const addOptimisticGasto = useCallback((gasto: Omit<OptimisticGasto, 'tempId'>) => {
    const tempId = crypto.randomUUID()
    setOptimisticGastos((current) => [{ ...gasto, tempId }, ...current])
    return tempId
  }, [])

  const removeOptimisticGasto = useCallback((tempId: string) => {
    setOptimisticGastos((current) =>
      current.filter((gasto) => gasto.tempId !== tempId),
    )
  }, [])

  const removeOptimisticGastos = useCallback((tempIds: string[]) => {
    const ids = new Set(tempIds)
    setOptimisticGastos((current) => current.filter((gasto) => !ids.has(gasto.tempId)))
  }, [])

  const refreshCuentas = useCallback(async () => {
    if (!user) {
      setCuentas([])
      setCuentasLoading(false)
      return
    }

    setCuentasLoading(true)
    const { data, error } = await listCuentas(user.id)

    if (error && data.length === 0) {
      showError(`No se pudieron cargar las cuentas: ${error}`)
      setCuentas([])
      setCuentasLoading(false)
      return
    }

    let result = data
    if (result.length === 0 && navigator.onLine) {
      const ensured = await ensureCuentaEfectivo(user.id)
      if (ensured.data) result = [ensured.data]
    }

    setCuentas(result)
    setCuentasLoading(false)
  }, [user])

  const applyGastoSaldo = useCallback(
    async (cuentaId: string, monto: number): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Sin sesión' }

      const base = resolveCuentasBase(user.id, cuentas)
      const { cuentas: updated, error: localError } = applyGastoSaldoLocal(
        user.id,
        base,
        cuentaId,
        monto,
      )
      if (localError) return { error: localError }

      setCuentas(updated)

      const cuenta = updated.find((c) => c.id === cuentaId)
      if (!cuenta) return { error: 'Cuenta no encontrada' }

      const { error: persistError } = await persistCuentaSaldo(
        user.id,
        cuentaId,
        cuenta.saldo_actual,
      )
      if (persistError) {
        setCachedCuentas(user.id, base)
        setCuentas(base)
        return { error: persistError }
      }

      return { error: null }
    },
    [user, cuentas],
  )

  const revertGastoSaldo = useCallback(
    async (cuentaId: string, monto: number): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Sin sesión' }

      const base = resolveCuentasBase(user.id, cuentas)
      const updated = revertGastoSaldoLocal(user.id, base, cuentaId, monto)
      setCuentas(updated)

      const cuenta = updated.find((c) => c.id === cuentaId)
      if (!cuenta) return { error: 'Cuenta no encontrada' }

      const { error: persistError } = await persistCuentaSaldo(
        user.id,
        cuentaId,
        cuenta.saldo_actual,
      )
      if (persistError) {
        setCachedCuentas(user.id, base)
        setCuentas(base)
        return { error: persistError }
      }

      return { error: null }
    },
    [user, cuentas],
  )

  const updatePendingCount = useCallback(async () => {
    const pending = await getPendingGastos()
    setPendingCount(pending.length)
    setPendingGastos(pending)
  }, [])

  const syncRecurring = useCallback(async () => {
    if (!user || !navigator.onLine) return 0

    const registered = await verificarGastosRecurrentes(user.id)
    if (registered > 0) {
      showSuccess(
        `${registered} gasto(s) recurrente(s) registrado(s) automáticamente.`,
      )
      refresh()
    }
    return registered
  }, [user, refresh])

  const syncOffline = useCallback(async () => {
    if (!user || !navigator.onLine) return

    setIsSyncing(true)
    try {
      const result = await syncPendingGastos()
      await updatePendingCount()

      if (result.optimisticTempIdsRemoved.length > 0) {
        removeOptimisticGastos(result.optimisticTempIdsRemoved)
      }

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
      if (user && navigator.onLine) {
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
  }, [user, syncOffline, syncRecurring, updatePendingCount])

  useEffect(() => {
    if (user) updatePendingCount()
  }, [user, refreshKey, updatePendingCount])

  useEffect(() => {
    refreshCuentas()
  }, [refreshCuentas, refreshKey])

  const contextValue = useMemo(
    () => ({
      refreshKey,
      refresh,
      isSyncing,
      pendingCount,
      pendingGastos,
      optimisticGastos,
      addOptimisticGasto,
      removeOptimisticGasto,
      removeOptimisticGastos,
      syncOffline,
      cuentas,
      cuentasLoading,
      refreshCuentas,
      applyGastoSaldo,
      revertGastoSaldo,
    }),
    [
      refreshKey,
      refresh,
      isSyncing,
      pendingCount,
      pendingGastos,
      optimisticGastos,
      addOptimisticGasto,
      removeOptimisticGasto,
      removeOptimisticGastos,
      syncOffline,
      cuentas,
      cuentasLoading,
      refreshCuentas,
      applyGastoSaldo,
      revertGastoSaldo,
    ],
  )

  return (
    <GastosRefreshContext.Provider value={contextValue}>
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
