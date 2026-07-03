import {
  formatMonthLabel,
  fromMonthInputValue,
  shiftMonth,
  toMonthInputValue,
} from '../utils/date'
import { buttonSecondaryClassName, inputClassName } from './formStyles'

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
        className={`shrink-0 min-w-11 ${buttonSecondaryClassName}`}
      >
        ←
      </button>
      <input
        type="month"
        value={toMonthInputValue(value)}
        onChange={(e) => onChange(fromMonthInputValue(e.target.value))}
        className={`min-w-0 flex-1 capitalize ${inputClassName}`}
        aria-label="Seleccionar mes"
      />
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, 1))}
        aria-label="Mes siguiente"
        className={`shrink-0 min-w-11 ${buttonSecondaryClassName}`}
      >
        →
      </button>
      <span className="sr-only">{formatMonthLabel(value)}</span>
    </div>
  )
}
