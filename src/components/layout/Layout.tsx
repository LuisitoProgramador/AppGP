import { memo, type ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  footer?: ReactNode
}

function Layout({ children, footer }: LayoutProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-pulso-bg text-white">
      <main className="mx-auto w-full max-w-lg flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4">
        {children}
      </main>
      {footer}
    </div>
  )
}

export default memo(Layout)
