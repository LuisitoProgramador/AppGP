import { memo } from 'react'
import type { SalidaTimelineItem } from '../utils/dashboard/salidasTimeline'
import { formatSalidaMonto } from '../utils/dashboard/salidasTimeline'
import { cardClassName } from './ui/formStyles'

interface SalidasTimelineProps {
  items: SalidaTimelineItem[]
}

function SalidasTimeline({ items }: SalidasTimelineProps) {
  if (items.length === 0) return null

  return (
    <section className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Salidas del mes</h2>
        <p className="text-sm text-slate-400">
          Pagos recurrentes y cuotas MSI programadas para este mes
        </p>
      </div>

      <ol className="relative space-y-0 border-l border-slate-700/80 pl-4">
        {items.map((item, index) => (
          <li key={`${item.dia}-${item.etiqueta}-${index}`} className="relative pb-4 last:pb-0">
            <span
              className={`absolute top-1.5 -left-[1.3rem] h-2.5 w-2.5 rounded-full ${
                item.tipo === 'msi' ? 'bg-pulso-accent-dim' : 'bg-pulso-accent-muted'
              }`}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Día {item.dia}</p>
                <p className="truncate text-sm text-slate-200">{item.etiqueta}</p>
                <p className="text-xs text-slate-500">
                  {item.tipo === 'msi' ? 'Cuota MSI' : 'Recurrente'}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-300">
                {formatSalidaMonto(item.monto)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default memo(SalidasTimeline)
