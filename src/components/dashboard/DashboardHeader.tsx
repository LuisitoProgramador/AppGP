import { memo, useEffect, useRef, useState } from 'react'
import MonthSelector from '../MonthSelector'
import { iconButtonClassName, togglePillClassName } from '../formStyles'

interface DashboardHeaderProps {
  selectedMonth: Date
  onMonthChange: (month: Date) => void
  isFocusMode: boolean
  onToggleFocusMode: () => void
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

function FocusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

export default memo(function DashboardHeader({
  selectedMonth,
  onMonthChange,
  isFocusMode,
  onToggleFocusMode,
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

  if (isFocusMode) {
    return (
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onToggleFocusMode}
          aria-pressed={isFocusMode}
          aria-label="Salir de vista concentrada"
          title="Salir de vista concentrada"
          className={`${iconButtonClassName} border border-indigo-500/50 bg-indigo-500/15 text-indigo-300 active:bg-indigo-500/25`}
        >
          <FocusIcon />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <MonthSelector value={selectedMonth} onChange={onMonthChange} />
      </div>

      <button
        type="button"
        onClick={onToggleFocusMode}
        aria-pressed={isFocusMode}
        aria-label="Activar vista concentrada"
        title="Vista concentrada"
        className={`${iconButtonClassName} border border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white active:bg-slate-700`}
      >
        <FocusIcon />
      </button>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`${iconButtonClassName} border border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white active:bg-slate-700`}
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
  )
})
