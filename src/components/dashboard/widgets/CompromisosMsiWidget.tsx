import { memo } from 'react'
import { formatCurrency } from '../../../utils/format/formatCurrency'
import type { MsiCompromisoMes } from '../../../utils/gastos/msiCompromisos'

interface CompromisosMsiWidgetProps {
  compromisos: MsiCompromisoMes[]
  interesTarjetasEstimado?: number | null
}

export default memo(function CompromisosMsiWidget({
  compromisos,
  interesTarjetasEstimado,
}: CompromisosMsiWidgetProps) {
  return (
    <div className="space-y-3 rounded-xl border border-pulso-accent/20 bg-pulso-accent/5 px-4 py-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-slate-200">Compromisos MSI</h3>
        <p className="text-xs text-slate-500">
          Cuánto de tu presupuesto ya está comprometido por mensualidades
        </p>
      </div>
      <div className="space-y-2">
        {compromisos.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <span className="capitalize text-slate-300">{item.label}</span>
            <div className="text-left sm:text-right">
              <p className="font-medium text-pulso-accent-muted">
                {formatCurrency(item.comprometido)} comprometidos
              </p>
              <p
                className={`text-xs ${
                  item.disponibleReal >= 0 ? 'text-pulso-accent-muted' : 'text-pulso-warning'
                }`}
              >
                {item.disponibleReal >= 0
                  ? `${formatCurrency(item.disponibleReal)} libres de ${formatCurrency(item.limite)}`
                  : `Excedido en ${formatCurrency(Math.abs(item.disponibleReal))}`}
              </p>
            </div>
          </div>
        ))}
      </div>
      {interesTarjetasEstimado != null && interesTarjetasEstimado > 0 && (
        <p className="border-t border-pulso-accent/15 pt-2 text-xs text-pulso-warning">
          Deuda en tarjetas: interés estimado ~{formatCurrency(interesTarjetasEstimado)}/mes si no
          pagas el total (configura la tasa en cada tarjeta).
        </p>
      )}
    </div>
  )
})
