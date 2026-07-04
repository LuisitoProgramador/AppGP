import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatMonthLabel, shiftMonth } from '../utils/date'
import { buttonSecondaryClassName, inputClassName } from './formStyles'

const MONTHS_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const

interface MonthSelectorProps {
  value: Date
  onChange: (date: Date) => void
}

function CalendarIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-slate-400"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

interface MonthPickerPanelProps {
  value: Date
  pickerYear: number
  titleId: string
  onSelectMonth: (monthIndex: number) => void
  onYearChange: (delta: number) => void
  onSelectCurrentMonth: () => void
  onClose: () => void
}

function MonthPickerPanel({
  value,
  pickerYear,
  titleId,
  onSelectMonth,
  onYearChange,
  onSelectCurrentMonth,
  onClose,
}: MonthPickerPanelProps) {
  const now = new Date()
  const selectedMonth = value.getMonth()
  const selectedYear = value.getFullYear()

  return (
    <div
      className="w-full max-w-xs rounded-2xl border border-white/10 bg-pulso-surface/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onYearChange(-1)}
          aria-label="Año anterior"
          className={`min-h-10 min-w-10 px-3 py-2 text-sm ${buttonSecondaryClassName}`}
        >
          ←
        </button>
        <p id={titleId} className="text-base font-semibold text-white">
          {pickerYear}
        </p>
        <button
          type="button"
          onClick={() => onYearChange(1)}
          aria-label="Año siguiente"
          className={`min-h-10 min-w-10 px-3 py-2 text-sm ${buttonSecondaryClassName}`}
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MONTHS_SHORT.map((label, monthIndex) => {
          const isSelected = pickerYear === selectedYear && monthIndex === selectedMonth
          const isCurrent =
            pickerYear === now.getFullYear() && monthIndex === now.getMonth()

          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelectMonth(monthIndex)}
              className={`min-h-11 rounded-xl px-2 py-2.5 text-sm font-medium touch-manipulation transition active:scale-[0.98] ${
                isSelected
                  ? 'bg-blue-500 text-white shadow-sm'
                  : isCurrent
                    ? 'border border-blue-500/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20'
                    : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-slate-400 transition hover:text-white"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={onSelectCurrentMonth}
          className="text-sm font-semibold text-blue-400 transition hover:text-blue-300"
        >
          Este mes
        </button>
      </div>
    </div>
  )
}

export default function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(value.getFullYear())
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (open) {
      setPickerYear(value.getFullYear())
    }
  }, [open, value])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow || 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function selectMonth(monthIndex: number) {
    onChange(new Date(pickerYear, monthIndex, 1))
    setOpen(false)
  }

  function selectCurrentMonth() {
    const now = new Date()
    onChange(new Date(now.getFullYear(), now.getMonth(), 1))
    setOpen(false)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(shiftMonth(value, -1))}
          aria-label="Mes anterior"
          className={`shrink-0 min-w-11 ${buttonSecondaryClassName}`}
        >
          ←
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Mes seleccionado: ${formatMonthLabel(value)}`}
          className={`flex min-w-0 flex-1 items-center justify-between gap-2 capitalize ${inputClassName}`}
        >
          <span className="truncate">{formatMonthLabel(value)}</span>
          <CalendarIcon />
        </button>

        <button
          type="button"
          onClick={() => onChange(shiftMonth(value, 1))}
          aria-label="Mes siguiente"
          className={`shrink-0 min-w-11 ${buttonSecondaryClassName}`}
        >
          →
        </button>
      </div>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-4 sm:items-center"
            onClick={() => setOpen(false)}
          >
            <div ref={panelRef}>
              <MonthPickerPanel
                value={value}
                pickerYear={pickerYear}
                titleId={titleId}
                onSelectMonth={selectMonth}
                onYearChange={(delta) => setPickerYear((year) => year + delta)}
                onSelectCurrentMonth={selectCurrentMonth}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
