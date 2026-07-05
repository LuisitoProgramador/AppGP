import { memo } from 'react'
import { useOfflineSyncActions } from '../../../contexts'

interface OfflineSyncStatusProps {
  isSyncing: boolean
  pendingCount: number
}

export default memo(function OfflineSyncStatus({ isSyncing, pendingCount }: OfflineSyncStatusProps) {
  const { syncOffline } = useOfflineSyncActions()

  if (!isSyncing && pendingCount === 0) return null

  return (
    <div className="space-y-1 text-center" data-testid="offline-sync-status">
      <p className="text-xs text-pulso-warning">
        {isSyncing
          ? 'Sincronizando cambios offline...'
          : `${pendingCount} elemento(s) pendiente(s) de sincronizar`}
      </p>
      {!isSyncing && pendingCount > 0 && (
        <>
          <button
            type="button"
            onClick={() => void syncOffline()}
            className="text-xs font-medium text-pulso-accent-muted underline-offset-2 active:text-pulso-accent active:underline"
          >
            Reintentar sincronización
          </button>
          <p className="text-[11px] text-slate-500">
            Pulso conserva los pendientes hasta que se sincronicen; no se borran solos.
          </p>
        </>
      )}
    </div>
  )
})
