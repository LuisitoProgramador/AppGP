import { CATEGORIAS_DEFAULT } from '../../types/gasto'
import { formatCurrency } from '../../utils/format/formatCurrency'
import type { PorcentajesRegla503020 } from '../../utils/finanzas/regla503020'

type Regla503020PreviewData = {
  necesidades: number
  caprichos: number
  ahorro: number
  limites: Partial<Record<(typeof CATEGORIAS_DEFAULT)[number], number>>
  porcentajes: PorcentajesRegla503020
}

type Regla503020PreviewProps = {
  ingresoMensualPreview: number
  regla503020Preview: Regla503020PreviewData
}

export default function Regla503020Preview({
  ingresoMensualPreview,
  regla503020Preview,
}: Regla503020PreviewProps) {
  const { porcentajes } = regla503020Preview

  return (
    <div className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">Regla 50 / 30 / 20</p>
        <p className="text-xs text-slate-500">
          Sobre {formatCurrency(ingresoMensualPreview)} de ingreso mensual (ajustada a tu{' '}
          {porcentajes.ahorro}% de ahorro)
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Necesidades</p>
          <p className="mt-0.5 text-sm font-bold text-white">
            {formatCurrency(regla503020Preview.necesidades)}
          </p>
          <p className="text-[10px] text-slate-500">{porcentajes.necesidades}%</p>
        </div>
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Caprichos</p>
          <p className="mt-0.5 text-sm font-bold text-white">
            {formatCurrency(regla503020Preview.caprichos)}
          </p>
          <p className="text-[10px] text-slate-500">{porcentajes.caprichos}%</p>
        </div>
        <div className="rounded-lg border border-pulso-accent/25 bg-pulso-accent/10 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Ahorro</p>
          <p className="mt-0.5 text-sm font-bold text-pulso-accent-muted">
            {formatCurrency(regla503020Preview.ahorro)}
          </p>
          <p className="text-[10px] text-slate-500">{porcentajes.ahorro}%</p>
        </div>
      </div>
      <ul className="space-y-1 text-xs text-slate-300">
        {CATEGORIAS_DEFAULT.map((categoria) => {
          const limite = regla503020Preview.limites[categoria]
          if (limite == null) return null
          return (
            <li key={categoria} className="flex justify-between gap-2">
              <span>{categoria}</span>
              <span className="text-slate-400">{formatCurrency(limite)}</span>
            </li>
          )
        })}
      </ul>
      <p className="text-[10px] leading-snug text-slate-500">
        Al guardar se actualizan los límites por categoría en el resumen y en Ajustes.
      </p>
    </div>
  )
}
