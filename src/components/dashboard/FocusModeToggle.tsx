import { memo } from 'react'

interface FocusModeToggleProps {
  isFocusMode: boolean
  onToggle: () => void
}

export default memo(function FocusModeToggle({ isFocusMode, onToggle }: FocusModeToggleProps) {
  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isFocusMode}
        aria-label={isFocusMode ? 'Salir de vista concentrada' : 'Activar vista concentrada'}
        title={isFocusMode ? 'Salir de vista concentrada' : 'Vista concentrada'}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border p-2.5 text-sm touch-manipulation transition-all duration-300 active:scale-[0.98] ${
          isFocusMode
            ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300 active:bg-indigo-500/25'
            : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white active:bg-slate-700'
        }`}
      >
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
      </button>
    </div>
  )
})
