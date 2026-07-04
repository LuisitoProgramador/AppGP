import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useCuentas, useGastosData } from '../contexts'
import { updateMsiGrupo, type MsiGrupoUndoSnapshot } from '../services/msiGrupo'
import { supabase } from '../services/supabase'
import { CATEGORIAS, type Gasto } from '../types/gasto'
import { formatCurrency } from '../utils/formatCurrency'
import { saldoDeltaAlCorregirMsiGrupo, sumMsiGrupoMontos } from '../utils/gastoSaldo'
import { buildMsiGastos, parseMsiDescripcion, toMsiInstallmentUpdates } from '../utils/msi'
import { isGastoFechaPasada } from '../utils/date'
import { isOnline } from '../utils/network'
import { showError, showInfo, showSuccess, showSuccessWithUndo } from '../utils/toast'
import {
  validateCuentaId,
  validateDescripcion,
  validateMonto,
  validateMsiMeses,
  validateNombre,
} from '../utils/validation'
import ModalPortal from './ModalPortal'
import { cardClassName, formWithKeyboardClassName, inputClassName, buttonPrimaryClassName, buttonSecondaryFlexClassName } from './formStyles'

interface GrupoMsiRow {
  id: number
  monto: number
  descripcion: string | null
  fecha: string
  categoria: string
}

export type EditGastoModo = 'cuota' | 'compra'

interface EditGastoModalProps {
  gasto: Gasto
  onClose: () => void
  modoInicial?: EditGastoModo
}

const OFFLINE_CUENTA_MSG =
  'La edición de cuentas requiere conexión a internet para sincronizar saldos.'

export default function EditGastoModal({
  gasto,
  onClose,
  modoInicial = 'cuota',
}: EditGastoModalProps) {
  const { refresh } = useGastosData()
  const { cuentas, cuentasLoading, applyGastoSaldo, revertGastoSaldo } = useCuentas()
  const [monto, setMonto] = useState(String(gasto.monto))
  const [categoria, setCategoria] = useState(gasto.categoria)
  const [descripcion, setDescripcion] = useState(gasto.descripcion ?? '')
  const [cuentaId, setCuentaId] = useState(gasto.cuenta_id ?? '')
  const [guardando, setGuardando] = useState(false)
  const [grupoRows, setGrupoRows] = useState<GrupoMsiRow[]>([])
  const [cargandoGrupo, setCargandoGrupo] = useState(false)
  const [corregirTotal, setCorregirTotal] = useState(modoInicial === 'compra')
  const [totalCompra, setTotalCompra] = useState('')
  const [mesesMsi, setMesesMsi] = useState('3')
  const [descripcionBase, setDescripcionBase] = useState('')

  const esMsi = Boolean(gasto.es_msi && gasto.grupo_msi_id)
  const gastoPasado = useMemo(() => isGastoFechaPasada(gasto.fecha), [gasto.fecha])
  const edicionBloqueada = useMemo(
    () => gastoPasado && (!esMsi || !corregirTotal),
    [gastoPasado, esMsi, corregirTotal],
  )
  const msiInfo = parseMsiDescripcion(gasto.descripcion ?? '')
  const totalGrupo = sumMsiGrupoMontos(grupoRows.length > 0 ? grupoRows : [{ monto: gasto.monto }])

  const cuentaOriginal = gasto.cuenta_id ?? ''
  const cuentaCambio = cuentaId !== cuentaOriginal

  const previewCuotas = useMemo(() => {
    if (!corregirTotal || !esMsi || !cuentaId || grupoRows.length === 0) return []

    const totalError = validateMonto(totalCompra)
    const mesesError = validateMsiMeses(mesesMsi)
    if (totalError || mesesError) return []

    const total = Number(totalCompra)
    const meses = Number(mesesMsi)
    const base =
      descripcionBase.trim() ||
      parseMsiDescripcion(grupoRows[0]?.descripcion ?? '')?.base ||
      'Compra MSI'

    return buildMsiGastos({
      totalMonto: total,
      months: meses,
      categoria,
      descripcion: base,
      cuentaId,
      startDate: new Date(grupoRows[0].fecha),
      grupoMsiId: gasto.grupo_msi_id!,
    })
  }, [
    corregirTotal,
    esMsi,
    cuentaId,
    gasto.grupo_msi_id,
    grupoRows,
    totalCompra,
    mesesMsi,
    descripcionBase,
    categoria,
  ])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!esMsi || !gasto.grupo_msi_id) return

    async function cargarGrupo() {
      setCargandoGrupo(true)
      const { data, error } = await supabase
        .from('gastos')
        .select('id, monto, descripcion, fecha, categoria')
        .eq('grupo_msi_id', gasto.grupo_msi_id)
        .order('fecha', { ascending: true })

      setCargandoGrupo(false)

      if (error) {
        showError(`No se pudo cargar el grupo MSI: ${error.message}`)
        return
      }

      const rows = (data ?? []) as GrupoMsiRow[]
      setGrupoRows(rows)
      setTotalCompra(String(sumMsiGrupoMontos(rows)))
      setMesesMsi(String(rows.length))

      const parsed = parseMsiDescripcion(rows[0]?.descripcion ?? gasto.descripcion ?? '')
      setDescripcionBase(parsed?.base ?? gasto.descripcion ?? '')
    }

    cargarGrupo()
  }, [esMsi, gasto.grupo_msi_id, gasto.descripcion])

  async function aplicarDeltaSaldo(cuentaSaldoId: string, delta: number): Promise<string | null> {
    if (delta === 0) return null

    const result =
      delta > 0
        ? await applyGastoSaldo(cuentaSaldoId, delta)
        : await revertGastoSaldo(cuentaSaldoId, Math.abs(delta))

    return result.error
  }

  function validarCambioCuenta(): string | null {
    if (!cuentaCambio) return null
    if (!isOnline()) return OFFLINE_CUENTA_MSG
    return validateCuentaId(cuentaId)
  }

  async function transferirSaldoEntreCuentas(
    cuentaOrigenId: string,
    cuentaDestinoId: string,
    montoTransferencia: number,
  ): Promise<string | null> {
    const revertError = await revertGastoSaldo(cuentaOrigenId, montoTransferencia)
    if (revertError) return revertError

    const applyError = await applyGastoSaldo(cuentaDestinoId, montoTransferencia)
    if (applyError) {
      const rollbackError = await applyGastoSaldo(cuentaOrigenId, montoTransferencia)
      if (rollbackError) {
        return `${applyError} (y no se pudo revertir: ${rollbackError})`
      }
      return applyError
    }

    return null
  }

  async function ajustarSaldoAlEditar(
    cuentaAnteriorId: string | null,
    cuentaNuevaId: string | null,
    montoAnterior: number,
    montoNuevo: number,
  ): Promise<string | null> {
    const cambioCuenta = Boolean(cuentaAnteriorId && cuentaNuevaId && cuentaAnteriorId !== cuentaNuevaId)
    const cambioMonto = montoAnterior !== montoNuevo

    if (!cambioCuenta && !cambioMonto) return null

    if (cambioCuenta && cuentaAnteriorId && cuentaNuevaId) {
      const revertError = await revertGastoSaldo(cuentaAnteriorId, montoAnterior)
      if (revertError) return revertError

      const applyError = await applyGastoSaldo(cuentaNuevaId, montoNuevo)
      if (applyError) {
        const rollbackError = await applyGastoSaldo(cuentaAnteriorId, montoAnterior)
        if (rollbackError) {
          return `${applyError} (y no se pudo revertir: ${rollbackError})`
        }
        return applyError
      }
      return null
    }

    if (!cuentaAnteriorId && cuentaNuevaId) {
      return (await applyGastoSaldo(cuentaNuevaId, montoNuevo)).error
    }

    if (cuentaAnteriorId && !cuentaNuevaId) {
      return (await revertGastoSaldo(cuentaAnteriorId, montoAnterior)).error
    }

    if (cuentaAnteriorId && cambioMonto) {
      return aplicarDeltaSaldo(cuentaAnteriorId, montoNuevo - montoAnterior)
    }

    return null
  }

  function buildUndoSnapshot(): MsiGrupoUndoSnapshot | null {
    if (!gasto.grupo_msi_id || !gasto.cuenta_id || grupoRows.length === 0) return null

    return {
      grupoMsiId: gasto.grupo_msi_id,
      cuentaId: gasto.cuenta_id,
      categoria: grupoRows[0].categoria,
      installments: grupoRows.map((row) => ({
        monto: Number(row.monto),
        descripcion: row.descripcion ?? '',
        fecha: row.fecha,
      })),
      totalCompra: sumMsiGrupoMontos(grupoRows),
    }
  }

  async function deshacerCorreccionMsi(
    snapshot: MsiGrupoUndoSnapshot,
    newTotal: number,
  ): Promise<void> {
    const { error } = await updateMsiGrupo({
      grupoMsiId: snapshot.grupoMsiId,
      categoria: snapshot.categoria,
      cuentaId: snapshot.cuentaId,
      installments: snapshot.installments,
    })

    if (error) {
      showError(`No se pudo deshacer: ${error}`)
      return
    }

    const deltaSaldo = saldoDeltaAlCorregirMsiGrupo(newTotal, snapshot.totalCompra)
    if (deltaSaldo !== 0) {
      const saldoError = await aplicarDeltaSaldo(snapshot.cuentaId, deltaSaldo)
      if (saldoError) {
        showError(`Grupo restaurado, pero el saldo no se revirtió: ${saldoError}`)
        refresh()
        return
      }
    }

    refresh()
    showInfo('Corrección MSI deshecha.')
  }

  async function guardarCorreccionTotal(): Promise<boolean> {
    const totalError = validateMonto(totalCompra)
    if (totalError) {
      showError(totalError)
      return false
    }

    const mesesError = validateMsiMeses(mesesMsi)
    if (mesesError) {
      showError(mesesError)
      return false
    }

    const nombreError = validateNombre(descripcionBase, 'La descripción de la compra')
    if (nombreError) {
      showError(nombreError)
      return false
    }

    const cuentaError = validarCambioCuenta()
    if (cuentaError) {
      showError(cuentaError)
      return false
    }

    if (!gasto.grupo_msi_id || grupoRows.length === 0) {
      showError('No se encontró el grupo MSI para corregir.')
      return false
    }

    const cuentaAnteriorId = gasto.cuenta_id
    if (!cuentaAnteriorId && !cuentaId) {
      showError('Selecciona la cuenta de pago de la compra.')
      return false
    }

    if (previewCuotas.length === 0) {
      showError('No se pudo calcular la redistribución de cuotas.')
      return false
    }

    const snapshot = buildUndoSnapshot()
    if (!snapshot) {
      showError('No se pudo preparar la corrección MSI.')
      return false
    }

    const newTotal = Number(totalCompra)
    const newCuentaId = cuentaId || cuentaAnteriorId!
    const cambioCuentaMsi = cuentaAnteriorId !== newCuentaId
    const deltaSaldo = saldoDeltaAlCorregirMsiGrupo(snapshot.totalCompra, newTotal)
    const installments = toMsiInstallmentUpdates(previewCuotas)

    if (cambioCuentaMsi) {
      const revertError = await revertGastoSaldo(cuentaAnteriorId!, snapshot.totalCompra)
      if (revertError) {
        showError(`No se pudo revertir el saldo de la cuenta original: ${revertError}`)
        return false
      }

      const applyError = await applyGastoSaldo(newCuentaId, newTotal)
      if (applyError) {
        await applyGastoSaldo(cuentaAnteriorId!, snapshot.totalCompra)
        showError(`No se pudo aplicar el saldo a la nueva cuenta: ${applyError}`)
        return false
      }
    } else if (deltaSaldo !== 0) {
      const saldoError = await aplicarDeltaSaldo(cuentaAnteriorId!, deltaSaldo)
      if (saldoError) {
        showError(`No se pudo ajustar el saldo: ${saldoError}`)
        return false
      }
    }

    const { error } = await updateMsiGrupo({
      grupoMsiId: gasto.grupo_msi_id,
      categoria,
      cuentaId: newCuentaId,
      installments,
    })

    if (error) {
      if (cambioCuentaMsi) {
        await revertGastoSaldo(newCuentaId, newTotal)
        await applyGastoSaldo(cuentaAnteriorId!, snapshot.totalCompra)
      } else if (deltaSaldo !== 0) {
        await aplicarDeltaSaldo(cuentaAnteriorId!, -deltaSaldo)
      }
      showError(`Error al actualizar compra MSI: ${error}`)
      return false
    }

    refresh()
    const meses = Number(mesesMsi)
    showSuccessWithUndo(
      `Compra MSI actualizada: ${formatCurrency(newTotal)} en ${meses} cuotas.`,
      () => deshacerCorreccionMsi(snapshot, newTotal),
    )
    return true
  }

  async function guardarCuotaIndividual(): Promise<boolean> {
    const cuentaError = validarCambioCuenta()
    if (cuentaError) {
      showError(cuentaError)
      return false
    }

    const hayCambiosCuota =
      !edicionBloqueada &&
      (Number(monto) !== Number(gasto.monto) ||
        descripcion.trim() !== (gasto.descripcion ?? '').trim() ||
        categoria !== gasto.categoria)

    if (edicionBloqueada && !cuentaCambio) {
      showError(
        'No puedes editar cuotas pasadas. Usa "Editar compra MSI completa" para ajustar el total.',
      )
      return false
    }

    if (cuentaCambio) {
      if (!gasto.cuenta_id || !gasto.grupo_msi_id || grupoRows.length === 0) {
        showError('No se encontró el grupo MSI para mover la cuenta.')
        return false
      }

      const totalGrupo = sumMsiGrupoMontos(grupoRows)
      const saldoError = await transferirSaldoEntreCuentas(
        gasto.cuenta_id,
        cuentaId,
        totalGrupo,
      )
      if (saldoError) {
        showError(`No se pudo transferir el saldo del grupo MSI: ${saldoError}`)
        return false
      }

      const { error: grupoError } = await supabase
        .from('gastos')
        .update({ cuenta_id: cuentaId })
        .eq('grupo_msi_id', gasto.grupo_msi_id)

      if (grupoError) {
        await transferirSaldoEntreCuentas(cuentaId, gasto.cuenta_id, totalGrupo)
        showError(`Error al actualizar la cuenta del grupo MSI: ${grupoError.message}`)
        return false
      }

      if (!hayCambiosCuota) return true
    }

    if (!hayCambiosCuota) return true

    const montoError = validateMonto(monto)
    if (montoError) {
      showError(montoError)
      return false
    }

    const descripcionError = validateDescripcion(descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return false
    }

    const { error } = await supabase
      .from('gastos')
      .update({
        monto: Number(monto),
        categoria,
        descripcion: descripcion.trim(),
      })
      .eq('id', gasto.id)

    if (error) {
      showError(`Error al actualizar: ${error.message}`)
      return false
    }

    return true
  }

  async function guardarGastoNormal(): Promise<boolean> {
    if (gastoPasado && !cuentaCambio) {
      showError('No puedes editar gastos con fecha pasada.')
      return false
    }

    const cuentaError = validarCambioCuenta()
    if (cuentaError) {
      showError(cuentaError)
      return false
    }

    const montoError = validateMonto(monto)
    if (montoError) {
      showError(montoError)
      return false
    }

    const descripcionError = validateDescripcion(descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return false
    }

    const newMonto = Number(monto)
    const oldMonto = Number(gasto.monto)
    const oldCuentaId = gasto.cuenta_id ?? null
    const newCuentaId = cuentaId || null

    const saldoError = await ajustarSaldoAlEditar(
      oldCuentaId,
      newCuentaId,
      oldMonto,
      newMonto,
    )
    if (saldoError) {
      showError(`No se pudo ajustar el saldo: ${saldoError}`)
      return false
    }

    const { error } = await supabase
      .from('gastos')
      .update({
        monto: newMonto,
        categoria,
        descripcion: descripcion.trim(),
        cuenta_id: newCuentaId,
      })
      .eq('id', gasto.id)

    if (error) {
      await ajustarSaldoAlEditar(newCuentaId, oldCuentaId, newMonto, oldMonto)
      showError(`Error al actualizar: ${error.message}`)
      return false
    }

    return true
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGuardando(true)

    if (esMsi && corregirTotal) {
      const ok = await guardarCorreccionTotal()
      setGuardando(false)
      if (ok) onClose()
      return
    }

    let ok = false
    if (esMsi) {
      ok = await guardarCuotaIndividual()
    } else {
      ok = await guardarGastoNormal()
    }

    setGuardando(false)

    if (!ok) return

    refresh()
    if (esMsi && cuentaCambio) {
      showSuccess(
        `Cuenta de la compra MSI actualizada. Se movieron ${grupoRows.length} cuotas (${formatCurrency(totalGrupo)}).`,
      )
    } else if (esMsi && Number(monto) !== Number(gasto.monto)) {
      showInfo(
        'Cuota actualizada. El saldo de crédito no cambia — usa "Editar compra MSI" si el monto total estaba mal.',
      )
    } else if (cuentaCambio) {
      showSuccess('Gasto actualizado y cuenta de pago cambiada correctamente.')
    } else {
      showSuccess('Gasto actualizado correctamente.')
    }
    onClose()
  }

  return (
    <ModalPortal onClose={onClose} ariaLabelledBy="edit-gasto-title">
      <form
        onSubmit={handleSubmit}
        className={`${cardClassName} max-h-[90svh] w-full max-w-lg overflow-y-auto ${formWithKeyboardClassName}`}
      >
        <div className="space-y-1">
          <h2 id="edit-gasto-title" className="text-lg font-semibold text-white">
            {corregirTotal && esMsi ? 'Editar compra MSI' : 'Editar gasto'}
          </h2>
          <p className="text-sm text-slate-400">
            {corregirTotal && esMsi
              ? 'Corrige el total, los meses y la redistribución de cuotas'
              : 'Corrige los datos del movimiento'}
          </p>
        </div>

        {esMsi && (
          <div className="space-y-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
            <p>
              Compra a meses sin intereses
              {msiInfo ? ` · Cuota ${msiInfo.index}/${msiInfo.total}` : ''}
              {cargandoGrupo ? '' : ` · Total compra ${formatCurrency(totalGrupo)}`}
            </p>
            <p className="text-xs text-violet-200/80">
              El saldo de tu tarjeta refleja el total de la compra. Editar una cuota solo cambia
              el presupuesto de ese mes.
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={corregirTotal}
                onChange={(e) => setCorregirTotal(e.target.checked)}
                className="rounded border-violet-400/50"
              />
              Editar compra MSI completa (total, meses y saldo de crédito)
            </label>
            {edicionBloqueada && esMsi && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                No puedes editar cuotas pasadas, el gasto ya ocurrió. Si quieres ajustar el total,
                debes editar el grupo MSI completo.
              </p>
            )}
          </div>
        )}

        {!esMsi && gastoPasado && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            No puedes editar gastos con fecha pasada, el movimiento ya ocurrió.
          </p>
        )}

        {esMsi && corregirTotal ? (
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
                onChange={(e) => setDescripcionBase(e.target.value)}
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
                <input
                  id="edit-total-msi"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={totalCompra}
                  onChange={(e) => setTotalCompra(e.target.value)}
                  className={inputClassName}
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
                  onChange={(e) => setMesesMsi(e.target.value)}
                  className={inputClassName}
                  required
                  disabled={cargandoGrupo}
                />
              </div>
            </div>

            {previewCuotas.length > 0 && (
              <p className="text-xs text-slate-400">
                {previewCuotas.length} cuotas de ~{' '}
                {formatCurrency(previewCuotas[0]?.monto ?? 0)} cada una
                {Number(mesesMsi) !== grupoRows.length && (
                  <span className="text-violet-300">
                    {' '}
                    (antes {grupoRows.length} cuotas)
                  </span>
                )}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="edit-monto" className="block text-sm font-medium text-slate-300">
              {esMsi ? 'Monto de esta cuota' : 'Monto'}
            </label>
            <input
              id="edit-monto"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={inputClassName}
              required
              disabled={edicionBloqueada}
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="edit-categoria" className="block text-sm font-medium text-slate-300">
            Categoría
          </label>
          <select
            id="edit-categoria"
            value={categoria}
            onChange={(e) =>
              setCategoria(e.target.value as (typeof CATEGORIAS)[number])
            }
            className={inputClassName}
            required
            disabled={edicionBloqueada}
          >
            {CATEGORIAS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-cuenta" className="block text-sm font-medium text-slate-300">
            Cuenta de pago
          </label>
          {!isOnline() && (
            <p className="text-xs text-amber-200">{OFFLINE_CUENTA_MSG}</p>
          )}
          <select
            id="edit-cuenta"
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value)}
            className={inputClassName}
            required
            disabled={!isOnline() || cuentasLoading || cuentas.length === 0}
          >
            {cuentasLoading && <option value="">Cargando cuentas...</option>}
            {!cuentasLoading && cuentas.length === 0 && (
              <option value="">No hay cuentas configuradas</option>
            )}
            {cuentas.map((cuenta) => (
              <option key={cuenta.id} value={cuenta.id}>
                {cuenta.nombre}
                {cuenta.tipo === 'credito' ? ' (Crédito)' : ''}
              </option>
            ))}
          </select>
          {esMsi && cuentaCambio && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Al cambiar la cuenta se moverá toda la compra MSI ({formatCurrency(totalGrupo)}{' '}
              en {grupoRows.length || '…'} cuotas) a la nueva tarjeta o cuenta.
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className={buttonSecondaryFlexClassName}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              guardando ||
              (esMsi && cargandoGrupo) ||
              (edicionBloqueada && !cuentaCambio)
            }
            className={`flex-1 ${buttonPrimaryClassName}`}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </ModalPortal>
  )
}
