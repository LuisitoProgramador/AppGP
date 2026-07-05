import { Fragment, memo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface BottomNavProps {
  children: ReactNode
}

/** Barra inferior anclada al borde del viewport (portal + safe area iOS PWA). */
function BottomNav({ children }: BottomNavProps) {
  return createPortal(
    <Fragment>
      <footer className="bottom-nav sm:hidden">
        <div className="bottom-nav__inner">{children}</div>
      </footer>
      {/* Sin transform en ancestros: fixed real al borde físico (iOS 26 PWA) */}
      <div className="bottom-nav-safe-fill sm:hidden" aria-hidden="true" />
    </Fragment>,
    document.body,
  )
}

export default memo(BottomNav)
