import { memo, useState, type ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export default memo(function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full min-h-11 items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-300 touch-manipulation transition active:scale-[0.98] active:bg-slate-700/50 hover:text-white"
      >
        <span>{title}</span>
        <span className="text-xs text-slate-500" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && <div className="space-y-4 border-t border-slate-700/60 px-4 py-4">{children}</div>}
    </div>
  )
})
