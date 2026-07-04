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
  const showIngreso = ingresoMensualTotal != null
  const showPatrimonio = patrimonioLiquido != null && patrimonioLiquido > 0

  if (!showIngreso && !showPatrimonio) return null

  return (
    <div className={`grid gap-2 ${showIngreso && showPatrimonio ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
      {showIngreso && (
        <div className="rounded-xl border border-pulso-accent/25 bg-pulso-accent/10 px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Ingreso mensual total
          </p>
          <p className="mt-1 text-xl font-bold text-pulso-accent-muted max-sm:text-lg">
            {formatCurrency(ingresoMensualTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            <span className="block sm:inline">Ingreso mensual</span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">límite de gasto {formatCurrency(limiteMensual)}</span>
          </p>
        </div>
      )}
      {showPatrimonio && (
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
