import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useCuentas, useGastosData } from '../contexts'
import { updateMsiGrupo, type MsiGrupoUndoSnapshot } from '../services/msiGrupo'
import { supabase } from '../services/supabase'
import { CATEGORIAS, type Gasto } from '../types/gasto'
import { formatCurrency } from '../utils/formatCurrency'
import { saldoDeltaAlCorregirMsiGrupo, sumMsiGrupoMontos } from '../utils/gastoSaldo'
import { buildMsiGastos, parseMsiDescripcion, toMsiInstallmentUpdates } from '../utils/msi'
import { isGastoFechaPasada } from '../utils/date'
import { showError, showInfo, showSuccess, showSuccessWithUndo } from '../utils/toast'
import {
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

export default function EditGastoModal({
  gasto,
  onClose,
  modoInicial = 'cuota',
}: EditGastoModalProps) {
  const { refresh } = useGastosData()
  const { applyGastoSaldo, revertGastoSaldo } = useCuentas()
  const [monto, setMonto] = useState(String(gasto.monto))
  const [categoria, setCategoria] = useState(gasto.categoria)
  const [descripcion, setDescripcion] = useState(gasto.descripcion ?? '')
  const [guardando, setGuardando] = useState(false)
  const [grupoRows, setGrupoRows] = useState<GrupoMsiRow[]>([])
  const [cargandoGrupo, setCargandoGrupo] = useState(false)
  const [corregirTotal, setCorregirTotal] = useState(modoInicial === 'compra')
  const [totalCompra, setTotalCompra] = useState('')
  const [mesesMsi, setMesesMsi] = useState('3')
  const [descripcionBase, setDescripcionBase] = useState('')

  const esMsi = Boolean(gasto.es_msi && gasto.grupo_msi_id)
  const cuotaPasada = useMemo(
    () => esMsi && !corregirTotal && isGastoFechaPasada(gasto.fecha),
    [esMsi, corregirTotal, gasto.fecha],
  )
  const msiInfo = parseMsiDescripcion(gasto.descripcion ?? '')
  const totalGrupo = sumMsiGrupoMontos(grupoRows.length > 0 ? grupoRows : [{ monto: gasto.monto }])

  const previewCuotas = useMemo(() => {
    if (!corregirTotal || !esMsi || !gasto.cuenta_id || grupoRows.length === 0) return []

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
      cuentaId: gasto.cuenta_id,
      startDate: new Date(grupoRows[0].fecha),
      grupoMsiId: gasto.grupo_msi_id!,
    })
  }, [
    corregirTotal,
    esMsi,
    gasto.cuenta_id,
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

  async function aplicarDeltaSaldo(cuentaId: string, delta: number): Promise<string | null> {
    if (delta === 0) return null

    const result =
      delta > 0
        ? await applyGastoSaldo(cuentaId, delta)
        : await revertGastoSaldo(cuentaId, Math.abs(delta))

    return result.error
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

    if (!gasto.grupo_msi_id || !gasto.cuenta_id || grupoRows.length === 0) {
      showError('No se encontró el grupo MSI para corregir.')
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
    const deltaSaldo = saldoDeltaAlCorregirMsiGrupo(snapshot.totalCompra, newTotal)
    const installments = toMsiInstallmentUpdates(previewCuotas)

    const { error } = await updateMsiGrupo({
      grupoMsiId: gasto.grupo_msi_id,
      categoria,
      cuentaId: gasto.cuenta_id,
      installments,
    })

    if (error) {
      showError(`Error al actualizar compra MSI: ${error}`)
      return false
    }

    if (deltaSaldo !== 0) {
      const saldoError = await aplicarDeltaSaldo(gasto.cuenta_id, deltaSaldo)
      if (saldoError) {
        showError(`Cuotas actualizadas, pero el saldo no se ajustó: ${saldoError}`)
        refresh()
        return false
      }
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
    if (cuotaPasada) {
      showError(
        'No puedes editar cuotas pasadas. Usa "Editar compra MSI completa" para ajustar el total.',
      )
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
    const delta = newMonto - oldMonto

    const { error } = await supabase
      .from('gastos')
      .update({
        monto: newMonto,
        categoria,
        descripcion: descripcion.trim(),
      })
      .eq('id', gasto.id)

    if (error) {
      showError(`Error al actualizar: ${error.message}`)
      return false
    }

    if (gasto.cuenta_id && delta !== 0) {
      const saldoError = await aplicarDeltaSaldo(gasto.cuenta_id, delta)
      if (saldoError) {
        showError(`Gasto actualizado, pero el saldo no se ajustó: ${saldoError}`)
        refresh()
        return false
      }
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
    if (esMsi && Number(monto) !== Number(gasto.monto)) {
      showInfo(
        'Cuota actualizada. El saldo de crédito no cambia — usa "Editar compra MSI" si el monto total estaba mal.',
      )
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
            {cuotaPasada && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                No puedes editar cuotas pasadas, el gasto ya ocurrió. Si quieres ajustar el total,
                debes editar el grupo MSI completo.
              </p>
            )}
          </div>
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
              disabled={cuotaPasada}
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
          >
            {CATEGORIAS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
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
              disabled={cuotaPasada}
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
            disabled={guardando || (esMsi && cargandoGrupo) || cuotaPasada}
            className={`flex-1 ${buttonPrimaryClassName}`}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </ModalPortal>
  )
}
