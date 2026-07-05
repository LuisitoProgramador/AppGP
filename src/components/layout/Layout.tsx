import { memo, type ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-pulso-bg text-white">
      <main className="app-scroll mx-auto min-h-0 w-full max-w-lg flex-1 px-4 pt-[max(1rem,var(--safe-area-top))] pb-[max(1rem,var(--safe-area-bottom))]">
        {children}
      </main>
    </div>
  )
}

export default memo(Layout)
