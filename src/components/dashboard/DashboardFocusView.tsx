import { memo } from 'react'

interface FocusView {
  presupuestoDiario: string
  disponible: string
  puedeGastar: boolean
}

interface DashboardFocusViewProps {
  esMesActual: boolean
  cargando: boolean
  focusView: FocusView
}

export default memo(function DashboardFocusView({
  esMesActual,
  cargando,
  focusView,
}: DashboardFocusViewProps) {
  return (
    <div className="space-y-10 py-8 text-center transition-all duration-300">
      {esMesActual && !cargando ? (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Presupuesto diario
            </p>
            <p
              className={`text-5xl font-bold transition-all duration-300 ${
                focusView.puedeGastar ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {focusView.presupuestoDiario}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Disponible
            </p>
            <p
              className={`text-5xl font-bold transition-all duration-300 ${
                focusView.puedeGastar ? 'text-white' : 'text-amber-300'
              }`}
            >
              {focusView.disponible}
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400">
          {cargando ? 'Cargando...' : 'La vista concentrada está disponible solo para el mes actual.'}
        </p>
      )}
    </div>
  )
})
