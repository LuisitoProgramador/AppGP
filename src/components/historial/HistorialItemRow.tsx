import { memo } from 'react'
import type { Gasto } from '../../types/gasto'
import { formatCurrency } from '../../utils/format/formatCurrency'
import { formatShortDate } from '../../utils/date'
import type { EditGastoModo } from '../editGasto/types'
import { EditIcon, SpinnerIcon, TrashIcon } from '../ui/icons'
import {
  iconButtonDangerClassName,
  iconButtonEditClassName,
  iconButtonMsiClassName,
} from '../ui/formStyles'
import { isHistorialPending, isHistorialIngreso, isHistorialPendingIngreso, type HistorialItem } from './historialTypes'

interface HistorialItemRowProps {
  item: HistorialItem
  isBusy: boolean
  isOptimistic: boolean
  onEdit: (gasto: Gasto, modo: EditGastoModo) => void
  onDelete: (item: HistorialItem) => void
}

const HistorialItemRow = memo(function HistorialItemRow({
  item,
  isBusy,
  isOptimistic,
  onEdit,
  onDelete,
}: HistorialItemRowProps) {
  const isPendingIngreso = isHistorialPendingIngreso(item)
  const isPending = isHistorialPending(item) || isPendingIngreso
  const isIngreso = isHistorialIngreso(item)

  return (
    <div className="flex flex-col gap-2 bg-slate-900/40 px-3 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start justify-between gap-2 sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {item.descripcion || item.categoria}
          </p>
          {(isOptimistic || isPending) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {isOptimistic && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-pulso-accent/20 px-2 py-0.5 text-xs text-pulso-accent-muted">
                  <SpinnerIcon />
                  Guardando...
                </span>
              )}
              {isPending && (
                <span className="shrink-0 rounded-full bg-pulso-warning/20 px-2 py-0.5 text-xs text-pulso-warning">
                  Pendiente
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-slate-400">
            {item.categoria} · {formatShortDate(item.fecha)}
          </p>
        </div>
        <p className={`shrink-0 text-sm font-semibold sm:hidden ${isIngreso ? 'text-emerald-400' : 'text-slate-200'}`}>
          {isIngreso ? '+' : ''}{formatCurrency(Number(item.monto))}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1.5">
        <p className={`hidden shrink-0 text-sm font-semibold sm:block ${isIngreso ? 'text-emerald-400' : 'text-slate-200'}`}>
          {isIngreso ? '+' : ''}{formatCurrency(Number(item.monto))}
        </p>
        {!isPending && !isOptimistic && !isIngreso && (
          <>
            <button
              type="button"
              onClick={() => onEdit(item as Gasto, 'cuota')}
              disabled={isBusy}
              aria-label="Editar gasto"
              title="Editar gasto"
              className={`${iconButtonEditClassName} max-sm:rounded-xl max-sm:border max-sm:border-pulso-accent/40 max-sm:bg-pulso-accent/15 max-sm:text-pulso-accent-muted max-sm:active:bg-pulso-accent/25 sm:inline-flex sm:items-center sm:gap-1.5 sm:px-3 sm:py-2 sm:text-xs sm:font-semibold`}
            >
              <EditIcon />
              <span className="hidden sm:inline">Editar</span>
            </button>
            {item.es_msi && item.grupo_msi_id && (
              <button
                type="button"
                onClick={() => onEdit(item as Gasto, 'compra')}
                disabled={isBusy}
                aria-label="Editar compra MSI"
                title="Editar compra MSI"
                className={iconButtonMsiClassName}
              >
                MSI
              </button>
            )}
          </>
        )}
        {!isOptimistic && (!isIngreso || isPendingIngreso) && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={isBusy}
            aria-label={isPendingIngreso ? 'Eliminar ingreso pendiente' : 'Eliminar gasto'}
            className={iconButtonDangerClassName}
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  )
})

export default HistorialItemRow
