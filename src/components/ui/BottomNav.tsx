import { memo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useIosBottomInset, useIsStandalonePwa } from '../../hooks/useIosBottomInset'

interface BottomNavProps {
  children: ReactNode
}

const SURFACE = '#242424'

/** Barra inferior anclada al borde del viewport (portal + safe area iOS PWA). */
function BottomNav({ children }: BottomNavProps) {
  const isStandalone = useIsStandalonePwa()
  const bottomInset = useIosBottomInset()

  return createPortal(
    <>
      <footer
        className="bottom-nav sm:hidden"
        style={
          isStandalone
            ? { boxShadow: `0 ${bottomInset}px 0 ${SURFACE}` }
            : undefined
        }
      >
        <div className="bottom-nav__inner">{children}</div>
        {isStandalone && (
          <div
            className="bottom-nav__safe-area"
            aria-hidden="true"
            style={{ height: bottomInset }}
          />
        )}
      </footer>
      {isStandalone && (
        <div
          className="bottom-nav-viewport-fill sm:hidden"
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            height: bottomInset,
            transform: 'translateY(100%)',
            backgroundColor: SURFACE,
            zIndex: 39,
            pointerEvents: 'none',
          }}
        />
      )}
    </>,
    document.body,
  )
}

export default memo(BottomNav)
