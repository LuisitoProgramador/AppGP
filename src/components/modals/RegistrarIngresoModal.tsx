import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuthSession, useCuentas, useGastosRefreshState } from '../../contexts'
import { getDefaultCuentaId, registrarIngreso } from '../../services/cuentas'
import { formatCurrency } from '../../utils/format/formatCurrency'
import { parseMontoValue } from '../../utils/format/montoInput'
import { showError, showSuccess, showWarning } from '../../utils/core/toast'
import { validateDescripcion, validateMonto } from '../../utils/core/validation'
import ModalPortal from '../ui/ModalPortal'
import Select from '../ui/Select'
import MontoInput from '../ui/MontoInput'
import {
  buttonPrimaryClassName,
  buttonSecondaryFlexClassName,
  formSubmitClassName,
  inputClassName,
  modalFormClassName,
} from '../ui/formStyles'

interface RegistrarIngresoModalProps {
  onClose: () => void
  onSuccess?: () => void
}

export default function RegistrarIngresoModal({ onClose, onSuccess }: RegistrarIngresoModalProps) {
  const { user } = useAuthSession()
  const { cuentas, refreshCuentas } = useCuentas()
  const { refresh } = useGastosRefreshState()

  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [cuentaId, setCuentaId] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cuentasIngreso = useMemo(
    () => cuentas.filter((c) => c.tipo === 'efectivo' || c.tipo === 'debito'),
    [cuentas],
  )

  useEffect(() => {
    if (cuentaId) return
    const defaultId = getDefaultCuentaId(cuentasIngreso)
    if (defaultId) setCuentaId(defaultId)
  }, [cuentasIngreso, cuentaId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) {
      showError('Debes iniciar sesión.')
      return
    }

    const montoError = validateMonto(monto)
    if (montoError) {
      showError(montoError)
      return
    }

    const descripcionError = validateDescripcion(descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return
    }

    if (!cuentaId) {
      showError('Selecciona una cuenta para el ingreso.')
      return
    }

    setGuardando(true)
    const { error, offline } = await registrarIngreso(
      user.id,
      cuentaId,
      parseMontoValue(monto),
      descripcion,
    )
    setGuardando(false)

    if (error) {
      showError(`Error al registrar ingreso: ${error}`)
      return
    }

    if (offline) {
      showWarning(
        'Sin conexión. El ingreso se guardó localmente y se sincronizará al volver internet.',
      )
    } else {
      showSuccess(`Ingreso de ${formatCurrency(parseMontoValue(monto))} registrado.`)
    }
    await refreshCuentas()
    refresh()
    onSuccess?.()
    onClose()
  }

  return (
    <ModalPortal onClose={onClose} ariaLabelledBy="registrar-ingreso-title">
      <form
        onSubmit={handleSubmit}
        className={`${modalFormClassName} max-h-[90svh] overflow-y-auto`}
      >
        <div className="space-y-1">
          <h2 id="registrar-ingreso-title" className="text-lg font-semibold text-white">
            Registrar ingreso
          </h2>
          <p className="text-sm text-slate-400">
            Bonos, ventas u otros ingresos extra a tu cuenta
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="ingreso-descripcion" className="block text-sm font-medium text-slate-300">
            Descripción
          </label>
          <input
            id="ingreso-descripcion"
            type="text"
            inputMode="text"
            maxLength={200}
            placeholder="Ej. Bono, Venta laptop"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={inputClassName}
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="ingreso-monto" className="block text-sm font-medium text-slate-300">
            Monto
          </label>
          <MontoInput
            id="ingreso-monto"
            value={monto}
            onChange={setMonto}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="ingreso-cuenta" className="block text-sm font-medium text-slate-300">
            Cuenta
          </label>
          {cuentasIngreso.length === 0 ? (
            <p className="rounded-xl border border-pulso-warning/30 bg-pulso-warning/10 px-4 py-3 text-sm text-pulso-warning/90">
              No hay cuentas de efectivo o débito. Crea una cuenta primero.
            </p>
          ) : (
            <Select
              id="ingreso-cuenta"
              value={cuentaId}
              onChange={setCuentaId}
              options={cuentasIngreso.map((cuenta) => ({
                value: String(cuenta.id),
                label: `${cuenta.nombre} (${formatCurrency(cuenta.saldo_actual)})`,
              }))}
              required
            />
          )}
        </div>

        <div className={formSubmitClassName}>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={buttonSecondaryFlexClassName}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || cuentasIngreso.length === 0}
              className={`flex-1 ${buttonPrimaryClassName}`}
            >
              {guardando ? 'Guardando...' : 'Registrar ingreso'}
            </button>
          </div>
        </div>
      </form>
    </ModalPortal>
  )
}
