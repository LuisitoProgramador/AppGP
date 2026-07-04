import { memo } from 'react'
import { formatCurrency } from '../utils/formatCurrency'
import { dashboardCardClassName } from './formStyles'
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
      className={`${dashboardCardClassName} text-center ${
        proyeccion.enNegativo
          ? 'border-pulso-warning/25 bg-pulso-warning/10'
          : ''
      }`}
    >
      {proyeccion.enNegativo ? (
        <p className="text-sm text-pulso-warning/90">
          Al ritmo actual, podrías cerrar el mes en negativo. Intenta reducir gastos.
        </p>
      ) : (
        <p className="text-sm text-slate-200">
          Al ritmo actual, cerrarías el mes con{' '}
          <span className="font-semibold text-pulso-accent-muted">
            {formatCurrency(proyeccion.saldoProyectado)}
          </span>{' '}
          disponibles.
        </p>
      )}
    </div>
  )
})
