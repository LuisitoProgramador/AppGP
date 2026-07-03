import { memo } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'
import MonthSelector from '../MonthSelector'
import { togglePillClassName } from '../formStyles'

interface DashboardHeaderProps {
  selectedMonth: Date
  onMonthChange: (month: Date) => void
  mesLabel: string
  gastoTotal: number
  cargando: boolean
  modoViaje: boolean
  modoTranquilo: boolean
  onToggleModoViaje: () => void
  onToggleModoTranquilo: () => void
}

export default memo(function DashboardHeader({
  selectedMonth,
  onMonthChange,
  mesLabel,
  gastoTotal,
  cargando,
  modoViaje,
  modoTranquilo,
  onToggleModoViaje,
  onToggleModoTranquilo,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 transition-all duration-300">
      <div className="min-w-0 flex-1 space-y-3">
        <MonthSelector value={selectedMonth} onChange={onMonthChange} />
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Gasto del mes
          </p>
          <p className="text-sm capitalize text-slate-500">{mesLabel}</p>
          {cargando ? (
            <p className="pt-2 text-4xl font-bold text-slate-500">...</p>
          ) : (
            <p className="pt-2 text-4xl font-bold text-white">{formatCurrency(gastoTotal)}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <button
          type="button"
          onClick={onToggleModoViaje}
          className={`${togglePillClassName} ${
            modoViaje
              ? 'border-sky-500/50 bg-sky-500/15 text-sky-300 active:bg-sky-500/25'
              : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white active:bg-slate-700'
          }`}
          aria-pressed={modoViaje}
        >
          {modoViaje ? '✈ Modo viaje' : 'Modo viaje'}
        </button>
        <button
          type="button"
          onClick={onToggleModoTranquilo}
          className={`${togglePillClassName} ${
            modoTranquilo
              ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300 active:bg-indigo-500/25'
              : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white active:bg-slate-700'
          }`}
          aria-pressed={modoTranquilo}
        >
          {modoTranquilo ? '🌙 Modo tranquilo' : 'Modo tranquilo'}
        </button>
      </div>
    </div>
  )
})
