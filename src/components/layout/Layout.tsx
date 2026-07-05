import { memo, type ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-pulso-bg text-white">
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden px-4 pt-[max(1rem,var(--safe-area-top))]">
        {children}
      </div>
    </div>
  )
}

export default memo(Layout)
