import { useOfflineSyncStatus } from '../../contexts'
import { useHistorialQueries } from './useHistorialQueries'
import { useHistorialActions } from './useHistorialActions'

export function useHistorial() {
  const queries = useHistorialQueries()
  const actions = useHistorialActions()
  const { isSyncing, pendingCount } = useOfflineSyncStatus()

  return {
    ...queries,
    ...actions,
    isSyncing,
    pendingCount,
  }
}
