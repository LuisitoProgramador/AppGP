import { memo } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'
import type { MsiCompromisoMes } from '../../utils/msiCompromisos'

interface CompromisosMsiWidgetProps {
  compromisos: MsiCompromisoMes[]
}

export default memo(function CompromisosMsiWidget({ compromisos }: CompromisosMsiWidgetProps) {
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
    </div>
  )
})
