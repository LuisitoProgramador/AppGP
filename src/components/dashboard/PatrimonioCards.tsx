import { memo } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'

interface PatrimonioCardsProps {
  ingresoMensualTotal: number | null
  patrimonioLiquido: number | null
  limiteMensual: number
}

export default memo(function PatrimonioCards({
  ingresoMensualTotal,
  patrimonioLiquido,
  limiteMensual,
}: PatrimonioCardsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ingresoMensualTotal != null && (
        <div className="rounded-xl border border-pulso-accent/25 bg-pulso-accent/10 px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Ingreso mensual total
          </p>
          <p className="mt-1 text-xl font-bold text-pulso-accent-muted">
            {formatCurrency(ingresoMensualTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Ingreso mensual · límite de gasto {formatCurrency(limiteMensual)}
          </p>
        </div>
      )}
      {patrimonioLiquido != null && patrimonioLiquido > 0 && (
        <div className="rounded-xl border border-pulso-accent/25 bg-pulso-accent/10 px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Patrimonio líquido
          </p>
          <p className="mt-1 text-xl font-bold text-pulso-accent-muted">
            {formatCurrency(patrimonioLiquido)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Efectivo y cuentas de débito/ahorro</p>
        </div>
      )}
    </div>
  )
})
