import { type FormEvent, memo } from 'react'
import type { Categoria } from '../../types/gasto'
import {
  formSubmitClassName,
  formWithKeyboardClassName,
  inputClassName,
  buttonPrimaryClassName,
  buttonGhostClassName,
} from '../ui/formStyles'
import Select from '../ui/Select'
import MontoInput from '../ui/MontoInput'
import type { RecurrentesFormState } from './types'

interface GastosRecurrentesFormProps {
  form: RecurrentesFormState
  editandoId: number | null
  guardando: boolean
  categoriaOptions: { value: string; label: string }[]
  cuentasDisponibles: { id: string; nombre: string; tipo: string }[]
  cuentasLoading: boolean
  onFormChange: (updater: (prev: RecurrentesFormState) => RecurrentesFormState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancelEdicion: () => void
}

export default memo(function GastosRecurrentesForm({
  form,
  editandoId,
  guardando,
  categoriaOptions,
  cuentasDisponibles,
  cuentasLoading,
  onFormChange,
  onSubmit,
  onCancelEdicion,
}: GastosRecurrentesFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={`space-y-4 border-t border-slate-700/60 pt-4 ${formWithKeyboardClassName}`}
    >
      <h3 className="text-sm font-semibold text-slate-300">
        {editandoId != null ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}
      </h3>

      <div className="space-y-2">
        <label htmlFor="rec-descripcion" className="block text-sm font-medium text-slate-300">
          Descripción
        </label>
        <input
          id="rec-descripcion"
          type="text"
          inputMode="text"
          maxLength={200}
          placeholder="Ej. Suscripción, renta, seguro"
          value={form.descripcion}
          onChange={(e) => onFormChange((prev) => ({ ...prev, descripcion: e.target.value }))}
          className={inputClassName}
          required
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="rec-monto" className="block text-sm font-medium text-slate-300">
            Monto
          </label>
          <MontoInput
            id="rec-monto"
            value={form.monto}
            onChange={(value) => onFormChange((prev) => ({ ...prev, monto: value }))}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="rec-dia" className="block text-sm font-medium text-slate-300">
            Día del mes
          </label>
          <input
            id="rec-dia"
            type="number"
            inputMode="numeric"
            min="1"
            max="31"
            value={form.dia_mes}
            onChange={(e) => onFormChange((prev) => ({ ...prev, dia_mes: e.target.value }))}
            className={inputClassName}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="rec-categoria" className="block text-sm font-medium text-slate-300">
          Categoría
        </label>
        <Select
          id="rec-categoria"
          value={form.categoria}
          onChange={(categoria) =>
            onFormChange((prev) => ({
              ...prev,
              categoria: categoria as Categoria,
            }))
          }
          options={categoriaOptions}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="rec-cuenta" className="block text-sm font-medium text-slate-300">
          Cuenta de pago
        </label>
        <Select
          id="rec-cuenta"
          value={form.cuentaId}
          onChange={(cuentaId) => onFormChange((prev) => ({ ...prev, cuentaId }))}
          options={[
            ...(cuentasLoading
              ? [{ value: '', label: 'Cargando cuentas...', disabled: true }]
              : []),
            ...(!cuentasLoading && cuentasDisponibles.length === 0
              ? [{ value: '', label: 'No hay cuentas configuradas', disabled: true }]
              : []),
            ...cuentasDisponibles.map((cuenta) => ({
              value: String(cuenta.id),
              label: `${cuenta.nombre}${cuenta.tipo === 'credito' ? ' (Crédito)' : ''}`,
            })),
          ]}
          disabled={cuentasLoading || cuentasDisponibles.length === 0}
          required
        />
        {!cuentasLoading && cuentasDisponibles.length === 0 && (
          <p className="text-xs text-slate-500">
            No hay cuentas configuradas. Añade una para comenzar.
          </p>
        )}
      </div>

      <div className={formSubmitClassName}>
        {editandoId != null && (
          <button
            type="button"
            onClick={onCancelEdicion}
            className={`mb-2 w-full ${buttonGhostClassName}`}
          >
            Cancelar edición
          </button>
        )}
        <button
          type="submit"
          disabled={guardando || cuentasDisponibles.length === 0}
          className={buttonPrimaryClassName}
        >
          {guardando
            ? 'Guardando...'
            : editandoId != null
              ? 'Guardar cambios'
              : 'Guardar gasto recurrente'}
        </button>
      </div>
    </form>
  )
})
