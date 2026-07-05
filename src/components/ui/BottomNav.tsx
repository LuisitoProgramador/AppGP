import { memo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface BottomNavProps {
  children: ReactNode
}

/** Barra fija al viewport. box-shadow en CSS pinta el home indicator sin inflar el layout. */
function BottomNav({ children }: BottomNavProps) {
  return createPortal(
    <footer className="bottom-nav sm:hidden">
      <div className="bottom-nav__inner">{children}</div>
    </footer>,
    document.body,
  )
}

export default memo(BottomNav)
