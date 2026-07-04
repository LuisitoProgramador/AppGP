import { type FormEvent, useEffect, useState } from 'react'
import { useAuthSession } from '../../contexts'
import { createCuenta, updateCuenta } from '../../services/cuentas'
import { getTasaInteresMensual, setTasaInteresMensual } from '../../services/cuentaInteres'
import { CUENTA_TIPOS, type Cuenta, type CuentaTipo } from '../../types/cuenta'
import { parseMontoValue } from '../../utils/format/montoInput'
import { isOnline } from '../../utils/core/network'
import { showError, showSuccess } from '../../utils/core/toast'
import ModalPortal from '../ui/ModalPortal'
import Select from '../ui/Select'
import MontoInput from '../ui/MontoInput'
import {
  inputClassName,
  buttonPrimaryClassName,
  buttonGhostFlexClassName,
  modalFormClassName,
} from '../ui/formStyles'

const initialForm = {
  nombre: '',
  tipo: 'efectivo' as CuentaTipo,
  limite_credito: '',
  saldo_actual: '0',
  dia_corte: '',
  dia_pago: '',
  tasa_interes_mensual: '',
}

interface CuentaFormModalProps {
  open: boolean
  editingCuenta: Cuenta | null
  onClose: () => void
  onSuccess: () => void | Promise<void>
}

export default function CuentaFormModal({
  open,
  editingCuenta,
  onClose,
  onSuccess,
}: CuentaFormModalProps) {
  const { user } = useAuthSession()
  const [form, setForm] = useState(initialForm)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return

    if (editingCuenta) {
      const tasa = getTasaInteresMensual(editingCuenta.id)
      setForm({
        nombre: editingCuenta.nombre,
        tipo: editingCuenta.tipo,
        limite_credito: editingCuenta.limite_credito ? String(editingCuenta.limite_credito) : '',
        saldo_actual: String(editingCuenta.saldo_actual),
        dia_corte: editingCuenta.dia_corte != null ? String(editingCuenta.dia_corte) : '',
        dia_pago: editingCuenta.dia_pago != null ? String(editingCuenta.dia_pago) : '',
        tasa_interes_mensual: tasa != null ? String(tasa) : '',
      })
    } else {
      setForm(initialForm)
    }
  }, [open, editingCuenta])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) {
      showError('Debes iniciar sesión.')
      return
    }

    const nombre = form.nombre.trim()
    if (!nombre) {
      showError('El nombre de la cuenta es obligatorio.')
      return
    }

    const saldo = parseMontoValue(form.saldo_actual)
    if (Number.isNaN(saldo)) {
      showError('El saldo debe ser un número válido.')
      return
    }

    let limite_credito: number | null = null

    if (form.tipo === 'credito' && form.limite_credito) {
      limite_credito = parseMontoValue(form.limite_credito)
      if (Number.isNaN(limite_credito) || limite_credito <= 0) {
        showError('El límite de crédito debe ser mayor a 0.')
        return
      }
    }

    let dia_corte: number | null = null
    if (form.tipo === 'credito' && form.dia_corte.trim()) {
      dia_corte = Number(form.dia_corte)
      if (!Number.isInteger(dia_corte) || dia_corte < 1 || dia_corte > 31) {
        showError('El día de corte debe estar entre 1 y 31.')
        return
      }
    }

    let dia_pago: number | null = null
    if (form.tipo === 'credito' && form.dia_pago.trim()) {
      dia_pago = Number(form.dia_pago)
      if (!Number.isInteger(dia_pago) || dia_pago < 1 || dia_pago > 31) {
        showError('El día de pago debe estar entre 1 y 31.')
        return
      }
    }

    let tasaInteres: number | null = null
    if (form.tipo === 'credito' && form.tasa_interes_mensual.trim()) {
      tasaInteres = Number(form.tasa_interes_mensual.replace(',', '.'))
      if (!Number.isFinite(tasaInteres) || tasaInteres <= 0 || tasaInteres > 100) {
        showError('La tasa de interés debe ser un porcentaje entre 0 y 100.')
        return
      }
    }

    setGuardando(true)
    const offline = !isOnline()

    if (editingCuenta) {
      const { error } = await updateCuenta(user.id, editingCuenta.id, {
        nombre,
        tipo: form.tipo,
        saldo_actual: saldo,
        limite_credito,
        dia_corte,
        dia_pago,
      })
      setGuardando(false)
      if (error) {
        showError(`Error al actualizar cuenta: ${error}`)
        return
      }
      if (form.tipo === 'credito') {
        setTasaInteresMensual(editingCuenta.id, tasaInteres)
      }
      showSuccess('Cuenta actualizada.')
    } else {
      const { data, error } = await createCuenta(user.id, {
        nombre,
        tipo: form.tipo,
        saldo_actual: saldo,
        limite_credito,
        dia_corte,
        dia_pago,
      })
      setGuardando(false)

      if (error) {
        showError(`Error al crear cuenta: ${error}`)
        return
      }

      if (data && form.tipo === 'credito') {
        setTasaInteresMensual(data.id, tasaInteres)
      }

      showSuccess(
        offline
          ? 'Cuenta guardada localmente. Se sincronizará al reconectar.'
          : 'Cuenta registrada correctamente.',
      )
    }

    onClose()
    await onSuccess()
  }

  if (!open) return null

  return (
    <ModalPortal onClose={onClose} ariaLabelledBy="nueva-cuenta-title">
      <form onSubmit={handleSubmit} className={modalFormClassName}>
        <div className="space-y-1">
          <h3 id="nueva-cuenta-title" className="text-lg font-semibold text-white">
            {editingCuenta ? 'Editar cuenta' : 'Nueva cuenta'}
          </h3>
          <p className="text-sm text-slate-400">Registra efectivo, débito o tarjeta de crédito</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="cuenta-nombre" className="block text-sm font-medium text-slate-300">
            Nombre
          </label>
          <input
            id="cuenta-nombre"
            type="text"
            inputMode="text"
            maxLength={60}
            placeholder="Ej. Cuenta 1, Débito"
            value={form.nombre}
            onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            className={inputClassName}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="cuenta-tipo" className="block text-sm font-medium text-slate-300">
            Tipo
          </label>
          <Select
            id="cuenta-tipo"
            value={form.tipo}
            onChange={(tipo) =>
              setForm((prev) => ({
                ...prev,
                tipo: tipo as CuentaTipo,
              }))
            }
            options={CUENTA_TIPOS.map((tipo) => ({
              value: tipo.value,
              label: tipo.label,
            }))}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="cuenta-saldo" className="block text-sm font-medium text-slate-300">
            {form.tipo === 'credito' ? 'Deuda actual' : 'Saldo actual'}
          </label>
          <MontoInput
            id="cuenta-saldo"
            value={form.saldo_actual}
            onChange={(value) => setForm((prev) => ({ ...prev, saldo_actual: value }))}
            placeholder="0"
            required
          />
        </div>

        {form.tipo === 'credito' && (
          <>
            <div className="space-y-2">
              <label htmlFor="cuenta-limite" className="block text-sm font-medium text-slate-300">
                Límite de crédito
              </label>
              <MontoInput
                id="cuenta-limite"
                value={form.limite_credito}
                onChange={(value) => setForm((prev) => ({ ...prev, limite_credito: value }))}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="cuenta-corte" className="block text-sm font-medium text-slate-300">
                Día de corte
              </label>
              <input
                id="cuenta-corte"
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                step="1"
                placeholder="Opcional (ej. 15)"
                value={form.dia_corte}
                onChange={(e) => setForm((prev) => ({ ...prev, dia_corte: e.target.value }))}
                className={inputClassName}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="cuenta-pago" className="block text-sm font-medium text-slate-300">
                Día de pago
              </label>
              <input
                id="cuenta-pago"
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                step="1"
                placeholder="Opcional (ej. 5). Te avisaré antes"
                value={form.dia_pago}
                onChange={(e) => setForm((prev) => ({ ...prev, dia_pago: e.target.value }))}
                className={inputClassName}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="cuenta-tasa" className="block text-sm font-medium text-slate-300">
                Tasa de interés mensual (%)
              </label>
              <input
                id="cuenta-tasa"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                placeholder="Opcional (ej. 3.5)"
                value={form.tasa_interes_mensual}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tasa_interes_mensual: e.target.value }))
                }
                className={inputClassName}
              />
              <p className="text-xs text-slate-500">
                Solo en este dispositivo. Sirve para estimar el costo de no pagar a meses.
              </p>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className={buttonGhostFlexClassName}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className={`flex-1 ${buttonPrimaryClassName}`}
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </ModalPortal>
  )
}
