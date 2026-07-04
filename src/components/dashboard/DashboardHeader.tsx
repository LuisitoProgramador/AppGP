import { memo, useEffect, useRef, useState } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'
import MonthSelector from '../MonthSelector'
import { iconButtonClassName, togglePillClassName } from '../formStyles'

interface DashboardHeaderProps {
  selectedMonth: Date
  onMonthChange: (month: Date) => void
  gastoTotal: number
  cargando: boolean
  modoViaje: boolean
  modoTranquilo: boolean
  onToggleModoViaje: () => void
  onToggleModoTranquilo: () => void
}

function SettingsIcon() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.25.4-1.51 1Z" />
    </svg>
  )
}

export default memo(function DashboardHeader({
  selectedMonth,
  onMonthChange,
  gastoTotal,
  cargando,
  modoViaje,
  modoTranquilo,
  onToggleModoViaje,
  onToggleModoTranquilo,
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <MonthSelector value={selectedMonth} onChange={onMonthChange} />
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={`${iconButtonClassName} text-slate-400 hover:bg-slate-700/60 hover:text-white`}
            aria-label="Opciones del dashboard"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <SettingsIcon />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-52 space-y-2 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-xl backdrop-blur-md"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onToggleModoViaje()
                }}
                className={`w-full ${togglePillClassName} ${
                  modoViaje
                    ? 'border-sky-500/50 bg-sky-500/15 text-sky-300'
                    : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
                aria-pressed={modoViaje}
              >
                {modoViaje ? '✈ Modo viaje activo' : 'Modo viaje'}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onToggleModoTranquilo()
                }}
                className={`w-full ${togglePillClassName} ${
                  modoTranquilo
                    ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                    : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
                aria-pressed={modoTranquilo}
              >
                {modoTranquilo ? '🌙 Modo tranquilo activo' : 'Modo tranquilo'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/30 px-4 py-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Gastado en el mes</p>
        {cargando ? (
          <p className="mt-1 text-3xl font-bold text-slate-500">...</p>
        ) : (
          <p className="mt-1 text-3xl font-bold text-white sm:text-4xl">
            {formatCurrency(gastoTotal)}
          </p>
        )}
      </div>
    </div>
  )
})
