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
  quincenaPeriodo: string | null
  vistaQuincenal: boolean
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
  quincenaPeriodo,
  vistaQuincenal,
  modoTranquilo,
  diaAgotamiento,
}: DashboardHeroCardProps) {
  const showBudget = esMesActual
  const dentroDeLimite = disponible >= 0 || modoTranquilo

  const cardTone = showBudget
    ? dentroDeLimite
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : 'border-amber-500/30 bg-amber-500/10'
    : 'border-white/10 bg-slate-900/35'

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
                dentroDeLimite ? 'text-white' : 'text-amber-300'
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
                    dentroDeLimite ? 'text-emerald-400/90' : 'text-amber-400/90'
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
              {vistaQuincenal ? (
                <>
                  Quincena {quincenaPeriodo} · Límite {formatCurrency(limiteMensual / 2)} ·{' '}
                  {diasRestantesEfectivos} días restantes
                </>
              ) : (
                <>
                  Límite mensual {formatCurrency(limiteMensual)} · {diasRestantesEfectivos} días
                  restantes
                </>
              )}
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
          {!cargando && diaAgotamiento != null && !vistaQuincenal && (
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
