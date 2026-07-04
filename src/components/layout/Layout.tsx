import { memo, type ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  /** Reserva espacio inferior para la barra fija en móvil */
  withBottomNav?: boolean
}

function Layout({ children, withBottomNav = false }: LayoutProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-pulso-bg text-white">
      <main
        className={`mx-auto min-h-0 w-full max-w-lg flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pt-[max(1.5rem,env(safe-area-inset-top))] ${
          withBottomNav ? 'pb-[var(--bottom-nav-total)]' : 'pb-4'
        }`}
      >
        {children}
      </main>
    </div>
  )
}

export default memo(Layout)
