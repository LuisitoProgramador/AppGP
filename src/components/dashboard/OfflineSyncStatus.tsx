import { memo } from 'react'
import { useOfflineSyncActions } from '../../contexts'

interface OfflineSyncStatusProps {
  isSyncing: boolean
  pendingCount: number
}

export default memo(function OfflineSyncStatus({ isSyncing, pendingCount }: OfflineSyncStatusProps) {
  const { syncOffline } = useOfflineSyncActions()

  if (!isSyncing && pendingCount === 0) return null

  return (
    <div className="space-y-1 text-center">
      <p className="text-xs text-pulso-warning">
        {isSyncing
          ? 'Sincronizando cambios offline...'
          : `${pendingCount} elemento(s) pendiente(s) de sincronizar`}
      </p>
      {!isSyncing && pendingCount > 0 && (
        <button
          type="button"
          onClick={() => void syncOffline()}
          className="text-xs font-medium text-blue-300 underline-offset-2 hover:text-blue-200 hover:underline"
        >
          Reintentar sincronización
        </button>
      )}
    </div>
  )
})
