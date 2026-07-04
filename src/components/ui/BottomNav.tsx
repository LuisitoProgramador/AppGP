import { memo, type ReactNode } from 'react'

interface BottomNavProps {
  children: ReactNode
}

/** Barra fija al borde inferior del viewport (PWA iOS). */
function BottomNav({ children }: BottomNavProps) {
  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-pulso-surface sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex h-[var(--bottom-nav-height)] max-w-lg items-center px-2">
        {children}
      </div>
    </footer>
  )
}

export default memo(BottomNav)
