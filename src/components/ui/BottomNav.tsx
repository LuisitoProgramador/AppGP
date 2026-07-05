import { memo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface BottomNavProps {
  children: ReactNode
}

const IOS_SAFE_BOTTOM = '34px'

/** Barra fija al viewport (portal). Evita hueco inferior en PWA iOS. */
function BottomNav({ children }: BottomNavProps) {
  return createPortal(
    <footer
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-pulso-surface sm:hidden"
      style={{
        paddingBottom: `max(${IOS_SAFE_BOTTOM}, env(safe-area-inset-bottom, ${IOS_SAFE_BOTTOM}))`,
      }}
    >
      <div className="mx-auto flex h-[var(--bottom-nav-height)] max-w-lg items-center px-2">
        {children}
      </div>
    </footer>,
    document.body,
  )
}

export default memo(BottomNav)
