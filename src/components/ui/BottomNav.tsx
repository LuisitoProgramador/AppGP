import { memo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface BottomNavProps {
  children: ReactNode
}

/** Barra inferior anclada al borde del viewport (portal + safe area iOS PWA). */
function BottomNav({ children }: BottomNavProps) {
  return createPortal(
    <footer className="bottom-nav sm:hidden">
      <div className="bottom-nav__inner">{children}</div>
    </footer>,
    document.body,
  )
}

export default memo(BottomNav)
