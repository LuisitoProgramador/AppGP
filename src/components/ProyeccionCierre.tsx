import { memo } from 'react'
import { formatCurrency } from '../utils/formatCurrency'
import type { ProyeccionCierreResult } from '../utils/proyeccionCierre'

interface ProyeccionCierreProps {
  proyeccion: ProyeccionCierreResult
  ocultarAdvertencias?: boolean
}

export default memo(function ProyeccionCierre({
  proyeccion,
  ocultarAdvertencias = false,
}: ProyeccionCierreProps) {
  if (proyeccion.enNegativo && ocultarAdvertencias) return null

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-center ${
        proyeccion.enNegativo
          ? 'border-amber-500/25 bg-amber-500/10'
          : 'border-slate-600/40 bg-slate-900/50'
      }`}
    >
      {proyeccion.enNegativo ? (
        <p className="text-sm text-amber-200">
          Al ritmo actual, podrías cerrar el mes en negativo. Intenta reducir gastos.
        </p>
      ) : (
        <p className="text-sm text-slate-200">
          Al ritmo actual, cerrarías el mes con{' '}
          <span className="font-semibold text-emerald-400">
            {formatCurrency(proyeccion.saldoProyectado)}
          </span>{' '}
          disponibles.
        </p>
      )}
    </div>
  )
})
