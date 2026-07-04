import { memo, type ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-pulso-bg text-white">
      <main className="mx-auto w-full max-w-lg flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] max-sm:pb-[var(--bottom-nav-total)]">
        {children}
      </main>
    </div>
  )
}

export default memo(Layout)
