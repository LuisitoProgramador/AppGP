import { lazy, Suspense, memo } from 'react'

const GastosRecurrentes = lazy(() => import('./GastosRecurrentes'))
const Metas = lazy(() => import('./Metas'))

function PlanSectionFallback() {
  return <p className="text-center text-sm text-slate-400">Cargando...</p>
}

export default memo(function Plan() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<PlanSectionFallback />}>
        <Metas />
      </Suspense>
      <Suspense fallback={<PlanSectionFallback />}>
        <GastosRecurrentes />
      </Suspense>
    </div>
  )
})
