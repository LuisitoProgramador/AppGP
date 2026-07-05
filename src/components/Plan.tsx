import { memo } from 'react'
import ErrorBoundary from './ui/ErrorBoundary'
import Metas from './Metas'
import GastosRecurrentes from './recurrentes/GastosRecurrentes'

export default memo(function Plan() {
  return (
    <div className="space-y-6">
      <ErrorBoundary title="Error en metas de ahorro">
        <Metas />
      </ErrorBoundary>
      <ErrorBoundary title="Error en gastos recurrentes">
        <GastosRecurrentes />
      </ErrorBoundary>
    </div>
  )
})
