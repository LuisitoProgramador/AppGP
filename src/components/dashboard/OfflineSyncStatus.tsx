import { memo } from 'react'

interface OfflineSyncStatusProps {
  isSyncing: boolean
  pendingCount: number
}

export default memo(function OfflineSyncStatus({ isSyncing, pendingCount }: OfflineSyncStatusProps) {
  if (!isSyncing && pendingCount === 0) return null

  return (
    <p className="text-center text-xs text-pulso-warning">
      {isSyncing
        ? 'Sincronizando cambios offline...'
        : `${pendingCount} elemento(s) pendiente(s) de sincronizar`}
    </p>
  )
})
