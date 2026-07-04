import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useAuthContext, useCuentas, useGastosData } from '../contexts'
import { createCuenta } from '../services/cuentas'
import { CUENTA_TIPOS, type Cuenta, type CuentaTipo } from '../types/cuenta'
import { formatCurrency } from '../utils/formatCurrency'
import { parseMontoValue } from '../utils/montoInput'
import { getCorteEstado } from '../utils/diaCorte'
import { getCreditUtilization, utilizationColor } from '../utils/creditUtilization'
import { isOnline } from '../utils/network'
import { showError, showSuccess } from '../utils/toast'
import ModalPortal from './ModalPortal'
import RegistrarIngresoModal from './RegistrarIngresoModal'
import TransferenciaModal from './TransferenciaModal'
import Select from './Select'
import MontoInput from './MontoInput'
import {
  cardClassName,
  dashboardCardClassName,
  formWithKeyboardClassName,
  inputClassName,
  buttonPrimaryClassName,
  buttonGhostFlexClassName,
  toolbarButtonClassName,
  modalFormClassName,
} from './formStyles'

const initialForm = {
  nombre: '',
  tipo: 'efectivo' as CuentaTipo,
  limite_credito: '',
  saldo_actual: '0',
  dia_corte: '',
  dia_pago: '',
}

function tipoLabel(tipo: CuentaTipo): string {
  return CUENTA_TIPOS.find((t) => t.value === tipo)?.label ?? tipo
}

function CuentaCard({ cuenta }: { cuenta: Cuenta }) {
  const isCredito = cuenta.tipo === 'credito'
  const limite = cuenta.limite_credito ?? 0
  const disponible = isCredito ? limite - cuenta.saldo_actual : null
  const corteEstado = isCredito ? getCorteEstado(cuenta.dia_corte) : null
  const utilizacion = getCreditUtilization(cuenta)

  return (
    <div className={`${dashboardCardClassName} p-4`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{cuenta.nombre}</p>
        <p className="text-xs text-slate-400">{tipoLabel(cuenta.tipo)}</p>
      </div>

      {corteEstado === 'proximo' && cuenta.dia_corte != null && (
        <p className="mt-2 rounded-lg border border-pulso-warning/30 bg-pulso-warning/10 px-2 py-1 text-xs text-pulso-warning">
          Corte próximo (Día {cuenta.dia_corte}). Considera posponer compras grandes
        </p>
      )}

      {corteEstado === 'mejor_momento' && (
        <p className="mt-2 rounded-lg border border-pulso-accent/30 bg-pulso-accent/10 px-2 py-1 text-xs text-pulso-accent-muted">
          Mejor momento para comprar (Máximo financiamiento)
        </p>
      )}

      {isCredito ? (
        <div className="mt-2 space-y-0.5">
          <p className="text-sm text-red-300">
            Deuda: {formatCurrency(cuenta.saldo_actual)}
          </p>
          {limite > 0 && (
            <>
              <p className="text-xs text-pulso-accent-muted">
                Disponible: {formatCurrency(Math.max(disponible ?? 0, 0))} /{' '}
                {formatCurrency(limite)}
              </p>
              {utilizacion != null && (
                <p className={`text-xs ${utilizationColor(utilizacion)}`}>
                  Usas {utilizacion}% de tu límite
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm font-medium text-slate-200">
          Saldo: {formatCurrency(cuenta.saldo_actual)}
        </p>
      )}
    </div>
  )
}

interface ListaCuentasProps {
  embedded?: boolean
}

function TransferIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M7 7h11M7 7l3-3M7 7l3 3M17 17H6M17 17l-3 3M17 17l-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IngresoIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ListaCuentas({ embedded = false }: ListaCuentasProps) {
  const { user } = useAuthContext()
  const { cuentas, cuentasLoading, refreshCuentas } = useCuentas()
  const { refresh } = useGastosData()
  const [modalOpen, setModalOpen] = useState(false)
  const [ingresoModalOpen, setIngresoModalOpen] = useState(false)
  const [transferenciaModalOpen, setTransferenciaModalOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [guardando, setGuardando] = useState(false)

  const cargarCuentas = useCallback(async () => {
    await refreshCuentas()
  }, [refreshCuentas])

  useEffect(() => {
    cargarCuentas()
  }, [cargarCuentas])

  function openModal() {
    setForm(initialForm)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setForm(initialForm)
  }

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

    if (!isOnline()) {
      showError('Sin conexión. Conéctate para registrar una cuenta.')
      return
    }

    setGuardando(true)
    const { error } = await createCuenta(user.id, {
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

    showSuccess('Cuenta registrada correctamente.')
    closeModal()
    refresh()
    await cargarCuentas()
  }

  return (
    <section className={embedded ? 'space-y-4' : cardClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">Mis cuentas</h2>
          <p className="text-sm text-slate-400">Efectivo, débito y tarjetas de crédito</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTransferenciaModalOpen(true)}
            disabled={cuentas.length < 2}
            className={toolbarButtonClassName}
          >
            <TransferIcon />
            Transferir
          </button>
          <button
            type="button"
            onClick={() => setIngresoModalOpen(true)}
            className={toolbarButtonClassName}
          >
            <IngresoIcon />
            Ingreso
          </button>
          <button type="button" onClick={openModal} className={toolbarButtonClassName}>
            + Nueva cuenta
          </button>
        </div>
      </div>

      {cuentasLoading && (
        <p className="text-center text-sm text-slate-400">Cargando cuentas...</p>
      )}

      {!cuentasLoading && cuentas.length === 0 && (
        <p className="text-center text-sm text-slate-400">
          No hay cuentas configuradas. Añade una para comenzar.
        </p>
      )}

      {!cuentasLoading && cuentas.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {cuentas.map((cuenta) => (
            <CuentaCard key={cuenta.id} cuenta={cuenta} />
          ))}
        </div>
      )}

      {transferenciaModalOpen && (
        <TransferenciaModal
          onClose={() => {
            setTransferenciaModalOpen(false)
            refresh()
            void cargarCuentas()
          }}
        />
      )}

      {ingresoModalOpen && (
        <RegistrarIngresoModal
          onClose={() => {
            setIngresoModalOpen(false)
            refresh()
            void cargarCuentas()
          }}
        />
      )}

      {modalOpen && (
        <ModalPortal onClose={closeModal} ariaLabelledBy="nueva-cuenta-title">
          <form
            onSubmit={handleSubmit}
            className={`${modalFormClassName} ${formWithKeyboardClassName}`}
          >
            <div className="space-y-1">
              <h3 id="nueva-cuenta-title" className="text-lg font-semibold text-white">
                Nueva cuenta
              </h3>
              <p className="text-sm text-slate-400">
                Registra efectivo, débito o tarjeta de crédito
              </p>
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
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, saldo_actual: value }))
                }
                placeholder="0"
                required
              />
            </div>

            {form.tipo === 'credito' && (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="cuenta-limite"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Límite de crédito
                  </label>
                  <MontoInput
                    id="cuenta-limite"
                    value={form.limite_credito}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, limite_credito: value }))
                    }
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="cuenta-corte"
                    className="block text-sm font-medium text-slate-300"
                  >
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
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, dia_corte: e.target.value }))
                    }
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="cuenta-pago"
                    className="block text-sm font-medium text-slate-300"
                  >
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
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, dia_pago: e.target.value }))
                    }
                    className={inputClassName}
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeModal}
                className={buttonGhostFlexClassName}
              >
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
      )}
    </section>
  )
}
