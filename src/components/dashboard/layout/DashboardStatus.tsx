import { memo } from 'react'

interface DashboardStatusProps {
  error: string | null
  cargando: boolean
  sinGastos: boolean
}

export default memo(function DashboardStatus({ error, cargando, sinGastos }: DashboardStatusProps) {
  return (
    <>
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error al cargar datos: {error}
        </p>
      )}
      {!cargando && !error && sinGastos && (
        <p className="text-center text-sm text-slate-400">No hay gastos registrados en este mes.</p>
      )}
    </>
  )
})
