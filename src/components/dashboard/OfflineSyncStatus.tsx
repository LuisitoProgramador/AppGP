import { memo } from 'react'

interface OfflineSyncStatusProps {
  isSyncing: boolean
  pendingCount: number
}

export default memo(function OfflineSyncStatus({ isSyncing, pendingCount }: OfflineSyncStatusProps) {
  if (!isSyncing && pendingCount === 0) return null

  return (
    <p className="text-center text-xs text-amber-300">
      {isSyncing
        ? 'Sincronizando gastos offline...'
        : `${pendingCount} gasto(s) pendiente(s) de sincronizar`}
    </p>
  )
})
