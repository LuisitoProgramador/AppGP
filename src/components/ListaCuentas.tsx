import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useAuthContext, useCuentas, useGastosData } from '../contexts'
import { createCuenta } from '../services/cuentas'
import { CUENTA_TIPOS, type Cuenta, type CuentaTipo } from '../types/cuenta'
import { formatCurrency } from '../utils/formatCurrency'
import { getCorteEstado } from '../utils/diaCorte'
import { getCreditUtilization, utilizationColor } from '../utils/creditUtilization'
import { isOnline } from '../utils/network'
import { showError, showSuccess } from '../utils/toast'
import ModalPortal from './ModalPortal'
import RegistrarIngresoModal from './RegistrarIngresoModal'
import TransferenciaModal from './TransferenciaModal'
import { cardClassName, formWithKeyboardClassName, inputClassName, buttonPrimaryCompactClassName, buttonPrimaryClassName, buttonSecondaryFlexClassName, buttonGhostFlexClassName, buttonGhostSmClassName, modalFormClassName } from './formStyles'

const initialForm = {
  nombre: '',
  tipo: 'efectivo' as CuentaTipo,
  limite_credito: '',
  saldo_actual: '0',
  dia_corte: '',
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
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{cuenta.nombre}</p>
        <p className="text-xs text-slate-400">{tipoLabel(cuenta.tipo)}</p>
      </div>

      {corteEstado === 'proximo' && cuenta.dia_corte != null && (
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
          Corte próximo (Día {cuenta.dia_corte}). Considera posponer compras grandes
        </p>
      )}

      {corteEstado === 'mejor_momento' && (
        <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
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
              <p className="text-xs text-emerald-400">
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

export default function ListaCuentas() {
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

    const saldo = Number(form.saldo_actual)
    if (Number.isNaN(saldo)) {
      showError('El saldo debe ser un número válido.')
      return
    }

    let limite_credito: number | null = null

    if (form.tipo === 'credito' && form.limite_credito) {
      limite_credito = Number(form.limite_credito)
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
    <section className={cardClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">Mis cuentas</h2>
          <p className="text-sm text-slate-400">
            Efectivo, débito y tarjetas de crédito
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setTransferenciaModalOpen(true)}
            className={buttonGhostSmClassName}
            disabled={cuentas.length < 2}
          >
            Transferir
          </button>
          <button
            type="button"
            onClick={() => setIngresoModalOpen(true)}
            className={buttonGhostSmClassName}
          >
            + Ingreso
          </button>
          <button
            type="button"
            onClick={openModal}
            className={buttonPrimaryCompactClassName}
          >
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
        <div className="grid gap-3 sm:grid-cols-2">
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
              <select
                id="cuenta-tipo"
                value={form.tipo}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tipo: e.target.value as CuentaTipo,
                  }))
                }
                className={inputClassName}
                required
              >
                {CUENTA_TIPOS.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="cuenta-saldo" className="block text-sm font-medium text-slate-300">
                {form.tipo === 'credito' ? 'Deuda actual' : 'Saldo actual'}
              </label>
              <input
                id="cuenta-saldo"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.saldo_actual}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, saldo_actual: e.target.value }))
                }
                className={inputClassName}
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
                  <input
                    id="cuenta-limite"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="Opcional"
                    value={form.limite_credito}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, limite_credito: e.target.value }))
                    }
                    className={inputClassName}
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
