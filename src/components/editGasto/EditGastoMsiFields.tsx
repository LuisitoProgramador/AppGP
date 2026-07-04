import { formatCurrency } from '../../utils/formatCurrency'
import MontoInput from '../MontoInput'
import { inputClassName } from '../formStyles'
import type { GrupoMsiRow } from './types'

interface EditGastoMsiBannerProps {
  msiInfo: { index: number; total: number } | null
  cargandoGrupo: boolean
  totalGrupo: number
  corregirTotal: boolean
  onCorregirTotalChange: (value: boolean) => void
  edicionBloqueada: boolean
}

export default function EditGastoMsiBanner({
  msiInfo,
  cargandoGrupo,
  totalGrupo,
  corregirTotal,
  onCorregirTotalChange,
  edicionBloqueada,
}: EditGastoMsiBannerProps) {
  return (
    <div className="space-y-3 rounded-xl border border-pulso-accent/30 bg-pulso-accent/10 px-4 py-3 text-sm text-slate-200">
      <p>
        Compra a meses sin intereses
        {msiInfo ? ` · Cuota ${msiInfo.index}/${msiInfo.total}` : ''}
        {cargandoGrupo ? '' : ` · Total compra ${formatCurrency(totalGrupo)}`}
      </p>
      <p className="text-xs text-pulso-accent-muted/80">
        El saldo de tu tarjeta refleja el total de la compra. Editar una cuota solo cambia el
        presupuesto de ese mes.
      </p>
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={corregirTotal}
          onChange={(e) => onCorregirTotalChange(e.target.checked)}
          className="rounded border-pulso-accent/50"
        />
        Editar compra MSI completa (total, meses y saldo de crédito)
      </label>
      {edicionBloqueada && (
        <p className="rounded-lg border border-pulso-warning/30 bg-pulso-warning/10 px-3 py-2 text-xs text-pulso-warning/90">
          No puedes editar cuotas pasadas, el gasto ya ocurrió. Si quieres ajustar el total, debes
          editar el grupo MSI completo.
        </p>
      )}
    </div>
  )
}

interface EditGastoCompraFieldsProps {
  descripcionBase: string
  onDescripcionBaseChange: (value: string) => void
  totalCompra: string
  onTotalCompraChange: (value: string) => void
  mesesMsi: string
  onMesesMsiChange: (value: string) => void
  previewCuotas: { monto: number }[]
  grupoRows: GrupoMsiRow[]
  cargandoGrupo: boolean
}

export function EditGastoCompraFields({
  descripcionBase,
  onDescripcionBaseChange,
  totalCompra,
  onTotalCompraChange,
  mesesMsi,
  onMesesMsiChange,
  previewCuotas,
  grupoRows,
  cargandoGrupo,
}: EditGastoCompraFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="edit-descripcion-base" className="block text-sm font-medium text-slate-300">
          Descripción de la compra
        </label>
        <input
          id="edit-descripcion-base"
          type="text"
          inputMode="text"
          maxLength={200}
          value={descripcionBase}
          onChange={(e) => onDescripcionBaseChange(e.target.value)}
          className={inputClassName}
          required
          disabled={cargandoGrupo}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="edit-total-msi" className="block text-sm font-medium text-slate-300">
            Total de la compra
          </label>
          <MontoInput
            id="edit-total-msi"
            value={totalCompra}
            onChange={onTotalCompraChange}
            placeholder="0"
            required
            disabled={cargandoGrupo}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-meses-msi" className="block text-sm font-medium text-slate-300">
            Meses sin intereses
          </label>
          <input
            id="edit-meses-msi"
            type="number"
            inputMode="numeric"
            min="2"
            max="48"
            step="1"
            value={mesesMsi}
            onChange={(e) => onMesesMsiChange(e.target.value)}
            className={inputClassName}
            required
            disabled={cargandoGrupo}
          />
        </div>
      </div>

      {previewCuotas.length > 0 && (
        <p className="text-xs text-slate-400">
          {previewCuotas.length} cuotas de ~ {formatCurrency(previewCuotas[0]?.monto ?? 0)} cada una
          {Number(mesesMsi) !== grupoRows.length && (
            <span className="text-pulso-accent-muted"> (antes {grupoRows.length} cuotas)</span>
          )}
        </p>
      )}
    </div>
  )
}
