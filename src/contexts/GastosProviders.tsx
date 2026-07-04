import type { ReactNode } from 'react'
import { CuentasProvider } from './CuentasContext'
import { GastosDataProvider } from './GastosDataContext'
import { OfflineSyncProvider } from './OfflineSyncContext'
import { RecurrentesProvider } from './RecurrentesContext'

interface GastosProvidersProps {
  children: ReactNode
}

export function GastosProviders({ children }: GastosProvidersProps) {
  return (
    <GastosDataProvider>
      <RecurrentesProvider>
        <OfflineSyncProvider>
          <CuentasProvider>{children}</CuentasProvider>
        </OfflineSyncProvider>
      </RecurrentesProvider>
    </GastosDataProvider>
  )
}
