import { memo } from 'react'
import type { FlujoEfectivoAlerta } from '../../../utils/dashboard/flujoEfectivoAsistente'
import { dashboardCardClassName } from '../../ui/formStyles'

interface FlujoEfectivoAsistenteProps {
  alertas: FlujoEfectivoAlerta[]
}

export default memo(function FlujoEfectivoAsistente({ alertas }: FlujoEfectivoAsistenteProps) {
  if (alertas.length === 0) return null

  return (
    <section
      className={dashboardCardClassName}
      aria-label="Asistente de flujo de efectivo"
      data-testid="flujo-efectivo-asistente"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white">Próximas salidas</h3>
        <p className="text-xs text-slate-500">
          Recomendaciones según tus pagos recurrentes y cuotas MSI
        </p>
      </div>

      <ul className="space-y-2">
        {alertas.map((alerta) => (
          <li
            key={`${alerta.dia}-${alerta.etiqueta}`}
            className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${
              alerta.urgente
                ? 'border-pulso-warning/30 bg-pulso-warning/10 text-pulso-warning/95'
                : 'border-pulso-accent/20 bg-pulso-accent/5 text-slate-300'
            }`}
          >
            {alerta.mensaje}
          </li>
        ))}
      </ul>
    </section>
  )
})
