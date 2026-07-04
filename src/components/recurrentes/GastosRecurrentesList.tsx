import { memo } from 'react'
import type { GastoRecurrente } from '../../types/gasto'
import { formatCurrency } from '../../utils/format/formatCurrency'
import { iconButtonDangerClassName, iconButtonEditClassName } from '../ui/formStyles'
import { EditIcon, TrashIcon } from '../ui/icons'
import { cuentaLabel } from './types'

interface GastosRecurrentesListProps {
  items: GastoRecurrente[]
  cuentas: { id: string; nombre: string }[]
  cargando: boolean
  error: string | null
  eliminandoId: number | null
  onEdit: (item: GastoRecurrente) => void
  onEliminar: (item: GastoRecurrente) => void
}

export default memo(function GastosRecurrentesList({
  items,
  cuentas,
  cargando,
  error,
  eliminandoId,
  onEdit,
  onEliminar,
}: GastosRecurrentesListProps) {
  return (
    <>
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          No se pudieron cargar los gastos recurrentes: {error}
        </p>
      )}

      {cargando && <p className="text-center text-sm text-slate-400">Cargando...</p>}

      {!cargando && items.length > 0 && (
        <div className="divide-y divide-slate-700/80 overflow-hidden rounded-xl border border-slate-700/60">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-slate-900/40 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.descripcion}</p>
                <p className="truncate text-xs text-slate-400">
                  {item.categoria} · día {item.dia_mes} · {cuentaLabel(cuentas, item.cuenta_id)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-200">
                {formatCurrency(Number(item.monto))}
              </p>
              <button
                type="button"
                onClick={() => onEdit(item)}
                aria-label="Editar gasto recurrente"
                className={iconButtonEditClassName}
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={() => onEliminar(item)}
                disabled={eliminandoId === item.id}
                aria-label="Eliminar gasto recurrente"
                className={iconButtonDangerClassName}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {!cargando && items.length === 0 && !error && (
        <p className="text-center text-sm text-slate-400">
          No hay gastos recurrentes configurados.
        </p>
      )}
    </>
  )
})
