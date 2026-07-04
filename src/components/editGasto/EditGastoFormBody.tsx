import { CATEGORIA_SELECT_OPTIONS } from '../../constants/formOptions'
import { CATEGORIAS_DEFAULT } from '../../types/gasto'
import { formatCurrency } from '../../utils/format/formatCurrency'
import { isOnline } from '../../utils/core/network'
import Select from '../ui/Select'
import MontoInput from '../ui/MontoInput'
import { inputClassName } from '../ui/formStyles'
import EditGastoMsiBanner, { EditGastoCompraFields } from './EditGastoMsiFields'
import { OFFLINE_CUENTA_MSG } from './types'
import type { useEditGastoModal } from './useEditGastoModal'

type EditGastoFormBodyProps = ReturnType<typeof useEditGastoModal> & {
  esMsi: boolean
  gastoPasado: boolean
}

export default function EditGastoFormBody({
  esMsi,
  gastoPasado,
  msiInfo,
  cargandoGrupo,
  totalGrupo,
  corregirTotal,
  setCorregirTotal,
  edicionBloqueada,
  descripcionBase,
  setDescripcionBase,
  totalCompra,
  setTotalCompra,
  mesesMsi,
  setMesesMsi,
  previewCuotas,
  grupoRows,
  monto,
  setMonto,
  categoria,
  setCategoria,
  descripcion,
  setDescripcion,
  cuentas,
  cuentasLoading,
  cuentaId,
  setCuentaId,
  cuentaCambio,
}: EditGastoFormBodyProps) {
  return (
    <>
      {esMsi && (
        <EditGastoMsiBanner
          msiInfo={msiInfo}
          cargandoGrupo={cargandoGrupo}
          totalGrupo={totalGrupo}
          corregirTotal={corregirTotal}
          onCorregirTotalChange={setCorregirTotal}
          edicionBloqueada={edicionBloqueada}
        />
      )}

      {!esMsi && gastoPasado && (
        <p className="rounded-lg border border-pulso-warning/30 bg-pulso-warning/10 px-4 py-3 text-xs text-pulso-warning/90">
          No puedes editar gastos con fecha pasada, el movimiento ya ocurrió.
        </p>
      )}

      {esMsi && corregirTotal ? (
        <EditGastoCompraFields
          descripcionBase={descripcionBase}
          onDescripcionBaseChange={setDescripcionBase}
          totalCompra={totalCompra}
          onTotalCompraChange={setTotalCompra}
          mesesMsi={mesesMsi}
          onMesesMsiChange={setMesesMsi}
          previewCuotas={previewCuotas}
          grupoRows={grupoRows}
          cargandoGrupo={cargandoGrupo}
        />
      ) : (
        <div className="space-y-2">
          <label htmlFor="edit-monto" className="block text-sm font-medium text-slate-300">
            {esMsi ? 'Monto de esta cuota' : 'Monto'}
          </label>
          <MontoInput
            id="edit-monto"
            value={monto}
            onChange={setMonto}
            placeholder="0"
            required
            disabled={edicionBloqueada}
          />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="edit-categoria" className="block text-sm font-medium text-slate-300">
          Categoría
        </label>
        <Select
          id="edit-categoria"
          value={categoria}
          onChange={(value) => setCategoria(value as (typeof CATEGORIAS_DEFAULT)[number])}
          options={CATEGORIA_SELECT_OPTIONS}
          required
          disabled={edicionBloqueada}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-cuenta" className="block text-sm font-medium text-slate-300">
          Cuenta de pago
        </label>
        {!isOnline() && (
          <p className="text-xs text-pulso-warning/90">{OFFLINE_CUENTA_MSG}</p>
        )}
        <Select
          id="edit-cuenta"
          value={cuentaId}
          onChange={setCuentaId}
          options={[
            ...(cuentasLoading
              ? [{ value: '', label: 'Cargando cuentas...', disabled: true }]
              : []),
            ...(!cuentasLoading && cuentas.length === 0
              ? [{ value: '', label: 'No hay cuentas configuradas', disabled: true }]
              : []),
            ...cuentas.map((cuenta) => ({
              value: String(cuenta.id),
              label: `${cuenta.nombre}${cuenta.tipo === 'credito' ? ' (Crédito)' : ''}`,
            })),
          ]}
          required
          disabled={!isOnline() || cuentasLoading || cuentas.length === 0}
        />
        {esMsi && cuentaCambio && (
          <p className="rounded-lg border border-pulso-warning/30 bg-pulso-warning/10 px-3 py-2 text-xs text-pulso-warning/90">
            Al cambiar la cuenta se moverá toda la compra MSI ({formatCurrency(totalGrupo)} en{' '}
            {grupoRows.length || '…'} cuotas) a la nueva tarjeta o cuenta.
          </p>
        )}
      </div>

      {!corregirTotal && (
        <div className="space-y-2">
          <label htmlFor="edit-descripcion" className="block text-sm font-medium text-slate-300">
            Descripción
          </label>
          <input
            id="edit-descripcion"
            type="text"
            inputMode="text"
            maxLength={200}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={inputClassName}
            required
            disabled={edicionBloqueada}
          />
        </div>
      )}
    </>
  )
}
