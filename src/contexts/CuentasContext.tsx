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

export function CuentasProvider({ children }: CuentasProviderProps) {
  const { user } = useAuthSession()
  const { refreshKey } = useGastosRefreshState()
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [cuentasLoading, setCuentasLoading] = useState(true)
  const cuentasRef = useRef(cuentas)
  cuentasRef.current = cuentas

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
    if (result.length === 0 && isOnline()) {
      const ensured = await ensureCuentaEfectivo(user.id)
      if (ensured.data) result = [ensured.data]
    }

    setCuentas(result)
    setCuentasLoading(false)
  }, [user])

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
    [user],
  )

  const revertGastoSaldo = useCallback(
    async (cuentaId: string, monto: number): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Sin sesión' }

      const base = resolveCuentasBase(user.id, cuentasRef.current)
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
    [user],
  )

  useEffect(() => {
    refreshCuentas()
  }, [refreshCuentas, refreshKey])

  const contextValue = useMemo(
    () => ({
      cuentas,
      cuentasLoading,
      refreshCuentas,
      applyGastoSaldo,
      revertGastoSaldo,
    }),
    [cuentas, cuentasLoading, refreshCuentas, applyGastoSaldo, revertGastoSaldo],
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
