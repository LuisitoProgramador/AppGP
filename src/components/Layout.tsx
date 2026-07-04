import { memo, type ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-svh bg-pulso-bg text-white">
      <main className="mx-auto max-w-lg px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] max-sm:pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  )
}

export default memo(Layout)
