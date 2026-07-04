import { memo, type ReactNode } from 'react'

interface BottomNavProps {
  children: ReactNode
}

/** Barra inferior dentro del shell de la app (flex), pegada al borde con safe area. */
function BottomNav({ children }: BottomNavProps) {
  return (
    <footer
      className="shrink-0 border-t border-white/10 bg-pulso-surface sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex min-h-[var(--bottom-nav-height)] max-w-lg items-center px-2 pt-1">
        {children}
      </div>
    </footer>
  )
}

export default memo(BottomNav)
