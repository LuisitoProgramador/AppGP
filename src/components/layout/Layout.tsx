import { memo, type ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-pulso-bg text-white">
      <div className="app-scroll mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-[max(1rem,var(--safe-area-top))]">
        {children}
      </div>
    </div>
  )
}

export default memo(Layout)
