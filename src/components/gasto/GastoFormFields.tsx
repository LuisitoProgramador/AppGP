import MontoInput from '../ui/MontoInput'
import {
  buttonPrimaryClassName,
  chipPickerClassName,
  formSubmitClassName,
  inputClassName,
} from '../ui/formStyles'
import type { useGastoForm } from '../../hooks/forms/useGastoForm'

type GastoFormFieldsProps = Pick<
  ReturnType<typeof useGastoForm>,
  | 'form'
  | 'setForm'
  | 'guardando'
  | 'montoInputRef'
  | 'cuentas'
  | 'cuentasLoading'
  | 'categorias'
  | 'isCredito'
>

export default function GastoFormFields({
  form,
  setForm,
  guardando,
  montoInputRef,
  cuentas,
  cuentasLoading,
  categorias,
  isCredito,
}: GastoFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <label htmlFor="monto" className="block text-sm font-medium text-slate-300">
          Monto
        </label>
        <MontoInput
          ref={montoInputRef}
          id="monto"
          value={form.monto}
          onChange={(value) => setForm((prev) => ({ ...prev, monto: value }))}
          placeholder="0"
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-300">
          ¿Con qué pagaste?
          {cuentas.length > 1 && !form.cuentaId && (
            <span className="ml-1 font-normal text-pulso-warning">Elige una</span>
          )}
        </p>
        {cuentasLoading ? (
          <p className="text-sm text-slate-500">Cargando cuentas...</p>
        ) : cuentas.length === 0 ? (
          <p className="text-sm text-slate-500">Añade una cuenta en Ajustes para registrar gastos.</p>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Cuenta de pago">
            {cuentas.map((cuenta) => {
              const active = form.cuentaId === cuenta.id
              return (
                <button
                  key={cuenta.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setForm((prev) => ({ ...prev, cuentaId: cuenta.id }))}
                  className={chipPickerClassName(active)}
                >
                  {cuenta.nombre}
                  {cuenta.tipo === 'credito' ? ' · Crédito' : ''}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {isCredito && (
        <div className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-300">
              ¿Es a Meses Sin Intereses?
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={form.esMsi}
              aria-label="Meses sin intereses"
              onClick={() => setForm((prev) => ({ ...prev, esMsi: !prev.esMsi }))}
              className={`relative h-7 w-12 shrink-0 rounded-full transition active:scale-[0.98] ${
                form.esMsi ? 'bg-pulso-accent' : 'bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  form.esMsi ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>

          {form.esMsi && (
            <div className="space-y-2">
              <label htmlFor="meses-msi" className="block text-sm font-medium text-slate-300">
                Cantidad de meses
              </label>
              <input
                id="meses-msi"
                type="number"
                inputMode="numeric"
                min="2"
                max="48"
                step="1"
                placeholder="3, 6, 12..."
                value={form.mesesMsi}
                onChange={(e) => setForm((prev) => ({ ...prev, mesesMsi: e.target.value }))}
                className={inputClassName}
                required
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-300">Categoría</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categoría">
          {categorias.map((categoria) => {
            const active = form.categoria === categoria
            return (
              <button
                key={categoria}
                type="button"
                aria-pressed={active}
                onClick={() => setForm((prev) => ({ ...prev, categoria }))}
                className={chipPickerClassName(active)}
              >
                {categoria}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="descripcion" className="block text-sm font-medium text-slate-300">
          Descripción (opcional)
        </label>
        <input
          id="descripcion"
          type="text"
          inputMode="text"
          maxLength={200}
          placeholder="Ej. Restaurante, Amazon, gasolina…"
          value={form.descripcion}
          onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
          className={inputClassName}
        />
      </div>

      <div className={formSubmitClassName}>
        <button
          type="submit"
          disabled={guardando || cuentas.length === 0 || !form.cuentaId}
          className={buttonPrimaryClassName}
        >
          {guardando
            ? 'Guardando...'
            : form.esMsi
              ? 'Registrar compra MSI'
              : 'Guardar gasto'}
        </button>
      </div>
    </>
  )
}
