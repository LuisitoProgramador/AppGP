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
        data-app-scroll
        className={`app-scroll mx-auto w-full max-w-lg px-4 pt-[max(1.5rem,var(--safe-area-top))] ${
          withBottomNav ? 'pb-[var(--bottom-nav-total)]' : 'pb-[max(1rem,var(--safe-area-bottom))]'
        }`}
      >
        {children}
      </main>
    </div>
  )
}

export default memo(Layout)
