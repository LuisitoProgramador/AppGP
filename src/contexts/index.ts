export { AuthProvider, useAuthContext, useAuthSession, useAuthActions } from './AuthContext'
export { GastosProviders, GastosRefreshProvider } from './GastosProviders'
export { GastosDataProvider, useGastosData, useGastosRefreshState, useOptimisticGastosState } from './GastosDataContext'
export { CuentasProvider, useCuentas } from './CuentasContext'
export { OfflineSyncProvider, useOfflineSync, useOfflineSyncStatus, useOfflineSyncActions } from './OfflineSyncContext'
export { QuietModeProvider, useQuietMode } from './QuietModeContext'
export { FocusModeProvider, useFocusMode } from './FocusModeContext'

import { useMemo } from 'react'
import { useCuentas } from './CuentasContext'
import { useGastosData } from './GastosDataContext'
import { useOfflineSync } from './OfflineSyncContext'

/**
 * Hook de compatibilidad que combina los tres contextos de gastos.
 * Preferir useGastosRefreshState, useOptimisticGastosState, useCuentas o useOfflineSync según la necesidad.
 */
export function useGastosRefresh() {
  const gastosData = useGastosData()
  const cuentas = useCuentas()
  const offlineSync = useOfflineSync()

  return useMemo(
    () => ({
      ...gastosData,
      ...cuentas,
      ...offlineSync,
    }),
    [gastosData, cuentas, offlineSync],
  )
}
