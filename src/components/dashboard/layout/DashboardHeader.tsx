import { memo, useEffect, useRef, useState } from 'react'
import MonthSelector from '../../ui/MonthSelector'
import { iconButtonClassName, togglePillClassName } from '../../ui/formStyles'

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

function ModosIcon() {
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
      <line x1="21" x2="14" y1="4" y2="4" />
      <line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" />
      <line x1="10" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" />
      <line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="16" x2="16" y1="18" y2="22" />
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
      <path d="M4 7V4h3" />
      <path d="M17 4h3v3" />
      <path d="M4 17v3h3" />
      <path d="M17 20h3v-3" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
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

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('touchstart', handlePointerDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('touchstart', handlePointerDown)
    }
  }, [menuOpen])

  if (isFocusMode) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onToggleFocusMode}
          aria-pressed={isFocusMode}
          aria-label="Salir de vista concentrada"
          title="Salir de vista concentrada"
          className={`${iconButtonClassName} border border-pulso-accent/50 bg-pulso-accent/15 text-pulso-accent-muted active:bg-pulso-accent/25`}
        >
          <FocusIcon />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
      <div className="min-w-0 flex-1">
        <MonthSelector value={selectedMonth} onChange={onMonthChange} />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
      <button
        type="button"
        onClick={onToggleFocusMode}
        aria-pressed={isFocusMode}
        aria-label="Activar vista concentrada"
        title="Vista concentrada"
        className={`${iconButtonClassName} border border-slate-600 text-slate-400 active:border-slate-500 active:text-white active:bg-slate-700`}
      >
        <FocusIcon />
      </button>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`${iconButtonClassName} border ${
            modoViaje || modoTranquilo || menuOpen
              ? 'border-pulso-accent/50 bg-pulso-accent/15 text-pulso-accent-muted'
              : 'border-slate-600 text-slate-400 active:border-slate-500 active:text-white active:bg-slate-700'
          }`}
          aria-label="Modos de visualización"
          title="Modos de visualización"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <ModosIcon />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-52 space-y-2 rounded-xl border border-white/10 bg-pulso-surface/95 p-2 shadow-xl backdrop-blur-md"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onToggleModoViaje()
                setMenuOpen(false)
              }}
              className={`w-full ${togglePillClassName} ${
                modoViaje
                  ? 'border-pulso-accent/50 bg-pulso-accent/15 text-pulso-accent-muted'
                  : 'border-slate-600 text-slate-300 active:border-slate-500 active:text-white'
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
                setMenuOpen(false)
              }}
              className={`w-full ${togglePillClassName} ${
                modoTranquilo
                  ? 'border-pulso-accent/50 bg-pulso-accent/15 text-pulso-accent-muted'
                  : 'border-slate-600 text-slate-300 active:border-slate-500 active:text-white'
              }`}
              aria-pressed={modoTranquilo}
            >
              {modoTranquilo ? '🌙 Modo tranquilo activo' : 'Modo tranquilo'}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  )
})
