import { memo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface BottomNavProps {
  children: ReactNode
}

/** Barra inferior anclada al borde del viewport (portal + safe area iOS PWA). */
function BottomNav({ children }: BottomNavProps) {
  return createPortal(
    <footer
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-pulso-surface pb-[env(safe-area-inset-bottom,0px)] sm:hidden"
    >
      <div className="mx-auto flex h-[var(--bottom-nav-height)] max-w-lg items-center px-2">
        {children}
      </div>
    </footer>,
    document.body,
  )
}

export default memo(BottomNav)
