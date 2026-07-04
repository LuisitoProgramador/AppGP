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
              className={`mt-2 text-4xl font-bold sm:text-5xl ${
                dentroDeLimite ? 'text-white' : 'text-pulso-warning'
              }`}
            >
              {formatCurrency(disponible)}
            </p>
          )}

          <div className="my-5 border-t border-white/10" aria-hidden="true" />

          <div className="flex items-start justify-center gap-10 sm:gap-16">
            <div>
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
            <div>
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
            <p className="mt-4 text-xs text-slate-500">
              Límite mensual {formatCurrency(limiteMensual)} · {diasRestantesEfectivos} días
              restantes
            </p>
          )}
          {!cargando && (recibosEfectivos > 0 || msiPendientes > 0) && (
            <p className="mt-1 text-xs text-slate-500">
              Sin contar
              {recibosEfectivos > 0 && ` ${formatCurrency(recibosEfectivos)} en pagos próximos`}
              {recibosEfectivos > 0 && msiPendientes > 0 && ' ni'}
              {msiPendientes > 0 && ` ${formatCurrency(msiPendientes)} en MSI pendientes`}
            </p>
          )}
          {!cargando && diaAgotamiento != null && (
            <p className="mt-1 text-xs text-slate-500">
              Al ritmo actual, el presupuesto se agotaría alrededor del día {diaAgotamiento}
            </p>
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
