import { createPortal } from 'react-dom'
import { memo, useEffect, useState, type ReactNode } from 'react'

interface BottomNavProps {
  children: ReactNode
}

/** Barra fija al viewport (portal). Evita hueco inferior en PWA iOS. */
function BottomNav({ children }: BottomNavProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-pulso-surface sm:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
    >
      {children}
    </div>,
    document.body,
  )
}

export default memo(BottomNav)
