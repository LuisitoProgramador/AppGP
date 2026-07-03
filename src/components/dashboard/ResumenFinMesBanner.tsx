import { memo } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'
import type { ResumenFinMes } from '../../utils/resumenFinMes'

interface ResumenFinMesBannerProps {
  resumen: ResumenFinMes
}

export default memo(function ResumenFinMesBanner({ resumen }: ResumenFinMesBannerProps) {
  return (
    <div className="rounded-xl border border-slate-600/40 bg-slate-900/50 px-4 py-3">
      <p className="text-sm text-slate-200">
        En <span className="capitalize">{resumen.mesLabel}</span> gastaste{' '}
        {formatCurrency(resumen.gastoTotal)}
        {resumen.variacionPct != null && (
          <span className="text-slate-400">
            {' '}
            ({resumen.variacionPct > 0 ? '+' : ''}
            {resumen.variacionPct}% vs el mes anterior)
          </span>
        )}
        .
      </p>
      {resumen.metasTotal > 0 && (
        <p className="mt-1 text-xs text-emerald-400">
          Cumpliste {resumen.metasCumplidas} de {resumen.metasTotal} metas.
        </p>
      )}
    </div>
  )
})
