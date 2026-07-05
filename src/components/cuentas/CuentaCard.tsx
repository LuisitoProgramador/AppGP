import { calcInteresEstimado, getTasaInteresMensual } from '../../services/cuentaInteres'
import { CUENTA_TIPOS, type Cuenta, type CuentaTipo } from '../../types/cuenta'
import { formatCurrency } from '../../utils/format/formatCurrency'
import { getCorteEstado } from '../../utils/core/diaCorte'
import { getCreditUtilization, utilizationColor } from '../../utils/dashboard/creditUtilization'
import { cuentaCardClassName } from '../ui/formStyles'

function tipoLabel(tipo: CuentaTipo): string {
  return CUENTA_TIPOS.find((t) => t.value === tipo)?.label ?? tipo
}

interface CuentaCardProps {
  cuenta: Cuenta
  onEdit: (cuenta: Cuenta) => void
}

export default function CuentaCard({ cuenta, onEdit }: CuentaCardProps) {
  const isCredito = cuenta.tipo === 'credito'
  const limite = cuenta.limite_credito ?? 0
  const disponible = isCredito ? limite - cuenta.saldo_actual : null
  const corteEstado = isCredito ? getCorteEstado(cuenta.dia_corte) : null
  const utilizacion = getCreditUtilization(cuenta)
  const tasaInteres = isCredito ? getTasaInteresMensual(cuenta) : null
  const interesEstimado =
    isCredito && tasaInteres != null
      ? calcInteresEstimado(cuenta.saldo_actual, tasaInteres)
      : null

  return (
    <div className={cuentaCardClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{cuenta.nombre}</p>
          <p className="text-xs text-slate-400">{tipoLabel(cuenta.tipo)}</p>
        </div>
        <div className="shrink-0 text-right">
          <button
            type="button"
            onClick={() => onEdit(cuenta)}
            className="mb-1 text-[10px] font-medium text-pulso-accent-muted underline-offset-2 hover:text-pulso-accent hover:underline"
          >
            Editar
          </button>
          {isCredito ? (
            <>
              <p className="text-sm font-medium text-slate-200">
                {formatCurrency(cuenta.saldo_actual)}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Deuda</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-slate-200">
              {formatCurrency(cuenta.saldo_actual)}
            </p>
          )}
        </div>
      </div>

      {isCredito && limite > 0 && (
        <p className="mt-1.5 text-xs text-pulso-accent-muted">
          Disponible {formatCurrency(Math.max(disponible ?? 0, 0))} / {formatCurrency(limite)}
          {utilizacion != null && (
            <span className={` · ${utilizationColor(utilizacion)}`}>{utilizacion}% usado</span>
          )}
        </p>
      )}

      {interesEstimado != null && interesEstimado > 0 && (
        <p className="mt-1.5 text-xs text-pulso-warning">
          Interés estimado ~{formatCurrency(interesEstimado)}/mes ({tasaInteres}%)
        </p>
      )}

      {corteEstado === 'proximo' && cuenta.dia_corte != null && (
        <p className="mt-1.5 rounded-lg border border-pulso-warning/30 bg-pulso-warning/10 px-2 py-1 text-xs text-pulso-warning">
          Corte próximo (día {cuenta.dia_corte})
        </p>
      )}

      {corteEstado === 'mejor_momento' && (
        <p className="mt-1.5 rounded-lg border border-pulso-accent/30 bg-pulso-accent/10 px-2 py-1 text-xs text-pulso-accent-muted">
          Mejor momento para comprar
        </p>
      )}
    </div>
  )
}
