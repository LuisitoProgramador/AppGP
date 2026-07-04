import { memo } from 'react'
import type { ResumenBucket503020 } from '../../utils/regla503020'
import { formatCurrency } from '../../utils/formatCurrency'
import { dashboardCardClassName } from '../formStyles'

interface Regla503020WidgetProps {
  ingresoMensual: number
  ahorroMensual: number
  buckets: ResumenBucket503020[]
}

function barColor(porcentaje: number): string {
  if (porcentaje >= 1) return 'bg-pulso-danger'
  if (porcentaje >= 0.8) return 'bg-pulso-warning'
  return 'bg-pulso-accent'
}

export default memo(function Regla503020Widget({
  ingresoMensual,
  ahorroMensual,
  buckets,
}: Regla503020WidgetProps) {
  if (ingresoMensual <= 0) return null

  return (
    <section className={dashboardCardClassName}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white">Regla 50 / 30 / 20</h3>
        <p className="text-xs text-slate-500">
          Sobre {formatCurrency(ingresoMensual)} de ingreso este mes
        </p>
      </div>

      <div className="space-y-3">
        {buckets.map((item) => (
          <div key={item.bucket} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-300">{item.label}</span>
              <span className="text-slate-400">
                {formatCurrency(item.gastado)} / {formatCurrency(item.limite)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all ${barColor(item.porcentaje)}`}
                style={{ width: `${Math.min(item.porcentaje * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-pulso-accent/20 bg-pulso-accent/5 px-3 py-2 text-xs text-slate-300">
          Ahorro objetivo (20%):{' '}
          <span className="font-medium text-white">{formatCurrency(ahorroMensual)}</span>
        </div>
      </div>
    </section>
  )
})
