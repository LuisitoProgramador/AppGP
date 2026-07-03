import {
  formatMonthLabel,
  fromMonthInputValue,
  shiftMonth,
  toMonthInputValue,
} from '../utils/date'

interface MonthSelectorProps {
  value: Date
  onChange: (date: Date) => void
}

export default function MonthSelector({ value, onChange }: MonthSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, -1))}
        aria-label="Mes anterior"
        className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white transition hover:bg-slate-600"
      >
        ←
      </button>
      <input
        type="month"
        value={toMonthInputValue(value)}
        onChange={(e) => onChange(fromMonthInputValue(e.target.value))}
        className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm capitalize text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        aria-label="Seleccionar mes"
      />
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, 1))}
        aria-label="Mes siguiente"
        className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white transition hover:bg-slate-600"
      >
        →
      </button>
      <span className="sr-only">{formatMonthLabel(value)}</span>
    </div>
  )
}
