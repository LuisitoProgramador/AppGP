import { memo } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'
import { dashboardCardClassName } from '../formStyles'

interface DashboardHeroCardProps {
  gastoTotal: number
  cargando: boolean
  esMesActual: boolean
  disponible: number
  presupuestoDiario: number
  limiteMensual: number
  diasRestantesEfectivos: number
  recibosEfectivos: number
  msiPendientes: number
  modoTranquilo: boolean
  diaAgotamiento: number | null
}

export default memo(function DashboardHeroCard({
  gastoTotal,
  cargando,
  esMesActual,
  disponible,
  presupuestoDiario,
  limiteMensual,
  diasRestantesEfectivos,
  recibosEfectivos,
  msiPendientes,
  modoTranquilo,
  diaAgotamiento,
}: DashboardHeroCardProps) {
  const showBudget = esMesActual
  const dentroDeLimite = disponible >= 0 || modoTranquilo

  const cardTone = showBudget
    ? dentroDeLimite
      ? 'border-pulso-accent/30 bg-pulso-accent/10'
      : 'border-pulso-warning/30 bg-pulso-warning/10'
    : 'border-white/10 bg-pulso-surface-muted/50'

  return (
    <div className={`${dashboardCardClassName} px-5 py-6 text-center ${cardTone}`}>
      {showBudget ? (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Disponible este mes
          </p>
          {cargando ? (
            <p className="mt-2 text-4xl font-bold text-slate-500 sm:text-5xl">...</p>
          ) : (
            <p
              className={`mt-2 text-4xl font-bold max-sm:text-[clamp(1.75rem,9vw,2.5rem)] sm:text-5xl ${
                dentroDeLimite ? 'text-white' : 'text-pulso-warning'
              }`}
            >
              {formatCurrency(disponible)}
            </p>
          )}

          <div className="my-5 border-t border-white/10" aria-hidden="true" />

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:items-start sm:gap-10">
            <div className="w-full sm:w-auto">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Gasto del mes
              </p>
              {cargando ? (
                <p className="mt-1 text-base font-medium text-slate-500">...</p>
              ) : (
                <p className="mt-1 text-base font-medium text-slate-300">
                  {formatCurrency(gastoTotal)}
                </p>
              )}
            </div>
            <div className="w-full sm:w-auto">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Presupuesto diario
              </p>
              {cargando ? (
                <p className="mt-1 text-base font-medium text-slate-500">...</p>
              ) : (
                <p
                  className={`mt-1 text-base font-medium ${
                    dentroDeLimite ? 'text-pulso-accent-muted/90' : 'text-pulso-warning/90'
                  }`}
                >
                  {dentroDeLimite
                    ? formatCurrency(presupuestoDiario)
                    : `Excedido ${formatCurrency(Math.abs(disponible))}`}
                </p>
              )}
            </div>
          </div>

          {!cargando && (
            <ul className="mt-4 space-y-1 text-xs text-slate-500">
              <li>
                Límite mensual {formatCurrency(limiteMensual)} · {diasRestantesEfectivos} días
                restantes
              </li>
              {(recibosEfectivos > 0 || msiPendientes > 0) && (
                <li>
                  Sin contar
                  {recibosEfectivos > 0 && ` ${formatCurrency(recibosEfectivos)} en pagos próximos`}
                  {recibosEfectivos > 0 && msiPendientes > 0 && ' ni'}
                  {msiPendientes > 0 && ` ${formatCurrency(msiPendientes)} en MSI pendientes`}
                </li>
              )}
              {diaAgotamiento != null && (
                <li>
                  Al ritmo actual, el presupuesto se agotaría alrededor del día {diaAgotamiento}
                </li>
              )}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Gasto del mes
          </p>
          {cargando ? (
            <p className="mt-2 text-4xl font-bold text-slate-500 sm:text-5xl">...</p>
          ) : (
            <p className="mt-2 text-4xl font-bold text-white sm:text-5xl">
              {formatCurrency(gastoTotal)}
            </p>
          )}
        </>
      )}
    </div>
  )
})
