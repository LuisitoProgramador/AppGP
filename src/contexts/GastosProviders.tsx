import type { ReactNode } from 'react'
import { CuentasProvider } from './CuentasContext'
import { GastosDataProvider } from './GastosDataContext'
import { OfflineSyncProvider } from './OfflineSyncContext'

interface GastosProvidersProps {
  children: ReactNode
}

export function GastosProviders({ children }: GastosProvidersProps) {
  return (
    <GastosDataProvider>
      <OfflineSyncProvider>
        <CuentasProvider>{children}</CuentasProvider>
      </OfflineSyncProvider>
    </GastosDataProvider>
  )
}

/** @deprecated Usa GastosProviders */
export const GastosRefreshProvider = GastosProviders
