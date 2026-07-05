import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Cuenta } from '../types/cuenta'
import {
  applyGastoSaldoLocal,
  ensureCuentaEfectivo,
  listCuentas,
  persistCuentaSaldo,
  revertGastoSaldoLocal,
  resolveCuentasBase,
  setCachedCuentas,
} from '../services/cuentas'
import { queryKeys } from '../lib/queryKeys'
import { isOnline } from '../utils/core/network'
import { showError } from '../utils/core/toast'
import { useAuthSession } from './AuthContext'
import { useGastosRefreshState } from './GastosDataContext'

interface CuentasContextValue {
  cuentas: Cuenta[]
  cuentasLoading: boolean
  refreshCuentas: () => Promise<void>
  applyGastoSaldo: (cuentaId: string, monto: number) => Promise<{ error: string | null }>
  revertGastoSaldo: (cuentaId: string, monto: number) => Promise<{ error: string | null }>
}

const CuentasContext = createContext<CuentasContextValue | null>(null)

interface CuentasProviderProps {
  children: ReactNode
}

async function loadCuentasForUser(userId: string): Promise<Cuenta[]> {
  const { data, error } = await listCuentas(userId)

  if (error && data.length === 0) {
    throw new Error(error)
  }

  let result = data
  if (result.length === 0 && isOnline()) {
    const ensured = await ensureCuentaEfectivo(userId)
    if (ensured.data) result = [ensured.data]
  }

  return result
}

export function CuentasProvider({ children }: CuentasProviderProps) {
  const { user } = useAuthSession()
  const { refreshKey } = useGastosRefreshState()
  const queryClient = useQueryClient()
  const cuentasRef = useRef<Cuenta[]>([])

  const query = useQuery({
    queryKey: [...queryKeys.cuentas(user?.id), refreshKey],
    queryFn: () => loadCuentasForUser(user!.id),
    enabled: Boolean(user),
  })

  const cuentas = query.data ?? []
  cuentasRef.current = cuentas

  const refreshCuentas = useCallback(async () => {
    if (!user) return
    await queryClient.invalidateQueries({ queryKey: queryKeys.cuentas(user.id) })
  }, [queryClient, user])

  const setCuentasOptimistic = useCallback(
    (updater: (current: Cuenta[]) => Cuenta[]) => {
      if (!user) return
      queryClient.setQueryData<Cuenta[]>(
        [...queryKeys.cuentas(user.id), refreshKey],
        (current) => updater(current ?? []),
      )
    },
    [queryClient, refreshKey, user],
  )

  const applyGastoSaldo = useCallback(
    async (cuentaId: string, monto: number): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Sin sesión' }

      const base = resolveCuentasBase(user.id, cuentasRef.current)
      const { cuentas: updated, error: localError } = applyGastoSaldoLocal(
        user.id,
        base,
        cuentaId,
        monto,
      )
      if (localError) return { error: localError }

      setCuentasOptimistic(() => updated)

      const cuenta = updated.find((c) => c.id === cuentaId)
      if (!cuenta) return { error: 'Cuenta no encontrada' }

      const { error: persistError } = await persistCuentaSaldo(
        user.id,
        cuentaId,
        cuenta.saldo_actual,
      )
      if (persistError) {
        setCachedCuentas(user.id, base)
        setCuentasOptimistic(() => base)
        return { error: persistError }
      }

      return { error: null }
    },
    [setCuentasOptimistic, user],
  )

  const revertGastoSaldo = useCallback(
    async (cuentaId: string, monto: number): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Sin sesión' }

      const base = resolveCuentasBase(user.id, cuentasRef.current)
      const updated = revertGastoSaldoLocal(user.id, base, cuentaId, monto)
      setCuentasOptimistic(() => updated)

      const cuenta = updated.find((c) => c.id === cuentaId)
      if (!cuenta) return { error: 'Cuenta no encontrada' }

      const { error: persistError } = await persistCuentaSaldo(
        user.id,
        cuentaId,
        cuenta.saldo_actual,
      )
      if (persistError) {
        setCachedCuentas(user.id, base)
        setCuentasOptimistic(() => base)
        return { error: persistError }
      }

      return { error: null }
    },
    [setCuentasOptimistic, user],
  )

  useEffect(() => {
    if (query.error && cuentas.length === 0) {
      showError(`No se pudieron cargar las cuentas: ${(query.error as Error).message}`)
    }
  }, [query.error, cuentas.length])

  const contextValue = useMemo(
    () => ({
      cuentas,
      cuentasLoading: query.isLoading,
      refreshCuentas,
      applyGastoSaldo,
      revertGastoSaldo,
    }),
    [cuentas, query.isLoading, refreshCuentas, applyGastoSaldo, revertGastoSaldo],
  )

  return <CuentasContext.Provider value={contextValue}>{children}</CuentasContext.Provider>
}

export function useCuentas() {
  const context = useContext(CuentasContext)
  if (!context) {
    throw new Error('useCuentas debe usarse dentro de CuentasProvider')
  }
  return context
}
