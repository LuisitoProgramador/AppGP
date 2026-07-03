export { AuthProvider, useAuthContext } from './AuthContext'
export { GastosProviders, GastosRefreshProvider } from './GastosProviders'
export { GastosDataProvider, useGastosData } from './GastosDataContext'
export { CuentasProvider, useCuentas } from './CuentasContext'
export { OfflineSyncProvider, useOfflineSync } from './OfflineSyncContext'
export { QuietModeProvider, useQuietMode } from './QuietModeContext'
export { FocusModeProvider, useFocusMode } from './FocusModeContext'

import { useCuentas } from './CuentasContext'
import { useGastosData } from './GastosDataContext'
import { useOfflineSync } from './OfflineSyncContext'

/**
 * Hook de compatibilidad que combina los tres contextos de gastos.
 * Preferir useGastosData, useCuentas o useOfflineSync según la necesidad.
 */
export function useGastosRefresh() {
  const gastosData = useGastosData()
  const cuentas = useCuentas()
  const offlineSync = useOfflineSync()

  return {
    ...gastosData,
    ...cuentas,
    ...offlineSync,
  }
}
