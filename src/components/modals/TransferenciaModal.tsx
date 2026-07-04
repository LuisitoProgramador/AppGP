import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuthSession, useCuentas, useGastosRefreshState } from '../../contexts'
import { getDefaultCuentaId, realizarTransferencia } from '../../services/cuentas'
import type { Cuenta } from '../../types/cuenta'
import { formatCurrency } from '../../utils/format/formatCurrency'
import { parseMontoValue } from '../../utils/format/montoInput'
import { isOnline } from '../../utils/core/network'
import { showError, showSuccess } from '../../utils/core/toast'
import { validateCuentaId, validateMonto } from '../../utils/core/validation'
import ModalPortal from '../ui/ModalPortal'
import Select from '../ui/Select'
import MontoInput from '../ui/MontoInput'
import {
  buttonPrimaryClassName,
  buttonSecondaryFlexClassName,
  formSubmitClassName,
  modalFormClassName,
} from '../ui/formStyles'

interface TransferenciaModalProps {
  onClose: () => void
  onSuccess?: () => void
}

function cuentaOptionLabel(cuenta: Cuenta): string {
  if (cuenta.tipo === 'credito') {
    return `${cuenta.nombre} (Deuda: ${formatCurrency(cuenta.saldo_actual)})`
  }
  return `${cuenta.nombre} (${formatCurrency(cuenta.saldo_actual)})`
}

function saldoOrigenInsuficiente(origen: Cuenta | undefined, monto: number): string | null {
  if (!origen || monto <= 0) return null

  if (origen.tipo === 'efectivo' || origen.tipo === 'debito') {
    if (origen.saldo_actual < monto) {
      return `Saldo insuficiente. Disponible: ${formatCurrency(origen.saldo_actual)}`
    }
    return null
  }

  if (origen.limite_credito != null) {
    const disponible = origen.limite_credito - origen.saldo_actual
    if (monto > disponible) {
      return `Crédito insuficiente. Disponible: ${formatCurrency(Math.max(disponible, 0))}`
    }
  }

  return null
}

function pagoExcedeDeuda(destino: Cuenta | undefined, monto: number): string | null {
  if (!destino || destino.tipo !== 'credito' || monto <= 0) return null
  if (monto > destino.saldo_actual) {
    return `El pago supera la deuda (${formatCurrency(destino.saldo_actual)})`
  }
  return null
}

export default function TransferenciaModal({ onClose, onSuccess }: TransferenciaModalProps) {
  const { user } = useAuthSession()
  const { cuentas, refreshCuentas } = useCuentas()
  const { refresh } = useGastosRefreshState()

  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [monto, setMonto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cuentasDestino = useMemo(
    () => cuentas.filter((c) => c.id !== origenId),
    [cuentas, origenId],
  )

  const cuentaOrigen = useMemo(
    () => cuentas.find((c) => c.id === origenId),
    [cuentas, origenId],
  )

  const cuentaDestino = useMemo(
    () => cuentas.find((c) => c.id === destinoId),
    [cuentas, destinoId],
  )

  const esPagoTarjeta = cuentaDestino?.tipo === 'credito'

  useEffect(() => {
    if (origenId) return
    const defaultId = getDefaultCuentaId(cuentas)
    if (defaultId) setOrigenId(defaultId)
  }, [cuentas, origenId])

  useEffect(() => {
    if (!destinoId || destinoId === origenId) {
      const primera = cuentasDestino[0]
      setDestinoId(primera?.id ?? '')
    }
  }, [cuentasDestino, destinoId, origenId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) {
      showError('Debes iniciar sesión.')
      return
    }

    if (!isOnline()) {
      showError('Sin conexión. Conéctate para realizar una transferencia.')
      return
    }

    const montoError = validateMonto(monto)
    if (montoError) {
      showError(montoError)
      return
    }

    const origenError = validateCuentaId(origenId)
    if (origenError) {
      showError('Selecciona la cuenta de origen.')
      return
    }

    const destinoError = validateCuentaId(destinoId)
    if (destinoError) {
      showError('Selecciona la cuenta de destino.')
      return
    }

    if (origenId === destinoId) {
      showError('La cuenta de origen y destino deben ser diferentes.')
      return
    }

    const montoNum = parseMontoValue(monto)

    const saldoError = saldoOrigenInsuficiente(cuentaOrigen, montoNum)
    if (saldoError) {
      showError(saldoError)
      return
    }

    const deudaError = pagoExcedeDeuda(cuentaDestino, montoNum)
    if (deudaError) {
      showError(deudaError)
      return
    }

    setGuardando(true)
    const { error } = await realizarTransferencia(user.id, origenId, destinoId, montoNum)
    setGuardando(false)

    if (error) {
      showError(`Error al ${esPagoTarjeta ? 'pagar tarjeta' : 'transferir'}: ${error}`)
      return
    }

    const accion = esPagoTarjeta ? 'Pago a tarjeta' : 'Transferencia'
    showSuccess(`${accion} de ${formatCurrency(montoNum)} realizada.`)
    await refreshCuentas()
    refresh()
    onSuccess?.()
    onClose()
  }

  const montoNum = parseMontoValue(monto)
  const saldoAdvertencia =
    monto.trim() && !Number.isNaN(montoNum)
      ? saldoOrigenInsuficiente(cuentaOrigen, montoNum)
      : null

  return (
    <ModalPortal onClose={onClose} ariaLabelledBy="transferencia-title">
      <form
        onSubmit={handleSubmit}
        className={`${modalFormClassName} max-h-[90svh] overflow-y-auto`}
      >
        <div className="space-y-1">
          <h2 id="transferencia-title" className="text-lg font-semibold text-white">
            {esPagoTarjeta ? 'Pago a tarjeta' : 'Transferencia interna'}
          </h2>
          <p className="text-sm text-slate-400">
            {esPagoTarjeta
              ? 'Abona a la deuda de tu tarjeta desde otra cuenta'
              : 'Mueve dinero entre tus cuentas de efectivo o débito'}
          </p>
        </div>

        {cuentas.length < 2 ? (
          <p className="rounded-xl border border-pulso-warning/30 bg-pulso-warning/10 px-4 py-3 text-sm text-pulso-warning/90">
            Necesitas al menos dos cuentas para transferir o pagar una tarjeta.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="transferencia-origen" className="block text-sm font-medium text-slate-300">
                Cuenta origen
              </label>
              <Select
                id="transferencia-origen"
                value={origenId}
                onChange={setOrigenId}
                options={cuentas.map((cuenta) => ({
                  value: String(cuenta.id),
                  label: cuentaOptionLabel(cuenta),
                }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="transferencia-destino" className="block text-sm font-medium text-slate-300">
                Cuenta destino
              </label>
              <Select
                id="transferencia-destino"
                value={destinoId}
                onChange={setDestinoId}
                options={cuentasDestino.map((cuenta) => ({
                  value: String(cuenta.id),
                  label: cuentaOptionLabel(cuenta),
                }))}
                required
                disabled={cuentasDestino.length === 0}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="transferencia-monto" className="block text-sm font-medium text-slate-300">
                Monto
              </label>
              <MontoInput
                id="transferencia-monto"
                value={monto}
                onChange={setMonto}
                placeholder="0"
                required
                autoFocus
              />
              {saldoAdvertencia && (
                <p className="text-xs text-red-400">{saldoAdvertencia}</p>
              )}
            </div>
          </>
        )}

        <div className={formSubmitClassName}>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={buttonSecondaryFlexClassName}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || cuentas.length < 2 || Boolean(saldoAdvertencia)}
              className={`flex-1 ${buttonPrimaryClassName}`}
            >
              {guardando
                ? 'Procesando...'
                : esPagoTarjeta
                  ? 'Pagar tarjeta'
                  : 'Transferir'}
            </button>
          </div>
        </div>
      </form>
    </ModalPortal>
  )
}
