import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { inputClassName } from './formStyles'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
  required?: boolean
  placeholder?: string
  title?: string
  'aria-label'?: string
  className?: string
}

function ChevronDownIcon() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-blue-300"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export default function Select({
  id,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  placeholder = 'Seleccionar',
  title,
  'aria-label': ariaLabel,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const selectableOptions = options.filter((option) => !option.disabled)
  const selectedOption = options.find((option) => option.value === value)
  const displayLabel = selectedOption?.label ?? placeholder
  const listboxId = id ? `${id}-listbox` : undefined
  const panelTitle = title ?? ariaLabel ?? 'Elegir una opción'

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

  function handleSelect(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => {
          if (!disabled) setOpen(true)
        }}
        className={`flex items-center justify-between gap-3 text-left ${inputClassName} ${className} ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        }`}
      >
        <span className={`truncate ${selectedOption ? 'text-white' : 'text-slate-500'}`}>
          {displayLabel}
        </span>
        <ChevronDownIcon />
      </button>

      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={value}
          required={required}
          onChange={() => {}}
        />
      )}

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-4 sm:items-center"
            onClick={() => setOpen(false)}
          >
            <div
              ref={panelRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel ?? 'Opciones'}
              className="flex max-h-[min(70vh,24rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-pulso-surface/95 shadow-2xl shadow-black/40 backdrop-blur-md"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-sm font-semibold text-white">{panelTitle}</p>
              </div>

              <div className="overflow-y-auto p-2">
                {selectableOptions.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-slate-400">
                    No hay opciones disponibles
                  </p>
                ) : (
                  selectableOptions.map((option) => {
                    const isSelected = option.value === value

                    return (
                      <button
                        key={`${option.value}-${option.label}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(option.value)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left text-base touch-manipulation transition active:scale-[0.99] ${
                          isSelected
                            ? 'bg-blue-500/20 text-blue-100'
                            : 'text-slate-200 hover:bg-slate-700/60 hover:text-white'
                        }`}
                      >
                        <span className="min-w-0 flex-1">{option.label}</span>
                        {isSelected && <CheckIcon />}
                      </button>
                    )
                  })
                )}
              </div>

              <div className="border-t border-white/10 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-xl bg-slate-700/90 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-600 active:bg-slate-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
