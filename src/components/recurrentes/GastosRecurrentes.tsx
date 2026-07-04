import { type FormEvent, useEffect, useMemo, useState, memo } from 'react'
import { useAuthSession, useCuentas, useGastosRefreshState, useRecurrentes } from '../../contexts'
import {
  createGastoRecurrente,
  deleteGastoRecurrente,
  updateGastoRecurrente,
} from '../../services/gastos/gastosRecurrentes'
import { getDefaultCuentaId } from '../../services/cuentas'
import { useCategorias } from '../../hooks/useCategorias'
import { type GastoRecurrente } from '../../types/gasto'
import { parseMontoValue } from '../../utils/format/montoInput'
import { isOnline } from '../../utils/core/network'
import { showError, showSuccess } from '../../utils/core/toast'
import { validateDescripcion, validateDiaMes, validateMonto } from '../../utils/core/validation'
import { cardClassName } from '../ui/formStyles'
import GastosRecurrentesForm from './GastosRecurrentesForm'
import GastosRecurrentesList from './GastosRecurrentesList'
import { initialForm } from './types'

export default memo(function GastosRecurrentes() {
  const { user } = useAuthSession()
  const { cuentas, cuentasLoading } = useCuentas()
  const { refresh } = useGastosRefreshState()
  const { recurrentes: items, cargando, error } = useRecurrentes()
  const { categorias, selectOptions: categoriaOptions } = useCategorias(user?.id)
  const [form, setForm] = useState(initialForm)
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)

  useEffect(() => {
    if (form.cuentaId || cuentas.length === 0) return
    const defaultId = getDefaultCuentaId(cuentas)
    if (defaultId) {
      setForm((prev) => ({ ...prev, cuentaId: defaultId }))
    }
  }, [cuentas, form.cuentaId])

  useEffect(() => {
    if (categorias.includes(form.categoria)) return
    if (categorias.length > 0) {
      setForm((prev) => ({
        ...prev,
        categoria: categorias.includes(prev.categoria) ? prev.categoria : 'Otros',
      }))
    }
  }, [categorias, form.categoria])

  const cuentasDisponibles = useMemo(() => cuentas, [cuentas])

  function iniciarEdicion(item: GastoRecurrente) {
    setEditandoId(item.id)
    setForm({
      descripcion: item.descripcion,
      monto: String(item.monto),
      categoria: categorias.includes(item.categoria) ? item.categoria : 'Otros',
      dia_mes: String(item.dia_mes),
      cuentaId: item.cuenta_id ?? '',
    })
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setForm((prev) => ({
      ...initialForm,
      cuentaId: prev.cuentaId || getDefaultCuentaId(cuentas) || '',
      categoria: categorias.includes(prev.categoria) ? prev.categoria : 'Otros',
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const montoError = validateMonto(form.monto)
    if (montoError) {
      showError(montoError)
      return
    }

    const descripcionError = validateDescripcion(form.descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return
    }

    const diaError = validateDiaMes(form.dia_mes)
    if (diaError) {
      showError(diaError)
      return
    }

    if (!form.cuentaId) {
      showError('Selecciona la cuenta desde la que se cobrará este pago.')
      return
    }

    const diaMes = Number(form.dia_mes)

    if (!user) {
      showError('Debes iniciar sesión para guardar un gasto recurrente.')
      return
    }

    if (!isOnline()) {
      showError('Sin conexión. Conéctate a internet para gestionar gastos recurrentes.')
      return
    }

    const categoria = form.categoria
    setGuardando(true)

    if (editandoId != null) {
      const { error: updateError } = await updateGastoRecurrente(editandoId, {
        descripcion: form.descripcion.trim(),
        monto: parseMontoValue(form.monto),
        categoria,
        dia_mes: diaMes,
        cuenta_id: form.cuentaId,
      })
      setGuardando(false)

      if (updateError) {
        showError(`Error al actualizar: ${updateError}`)
        return
      }

      cancelarEdicion()
      showSuccess('Gasto recurrente actualizado.')
      refresh()
      return
    }

    const { error: createError } = await createGastoRecurrente({
      descripcion: form.descripcion.trim(),
      monto: parseMontoValue(form.monto),
      categoria,
      dia_mes: diaMes,
      cuenta_id: form.cuentaId,
    })

    setGuardando(false)

    if (createError) {
      showError(`Error al guardar: ${createError}`)
      return
    }

    setForm((prev) => ({
      ...initialForm,
      cuentaId: prev.cuentaId,
      categoria: prev.categoria,
    }))
    showSuccess('Gasto recurrente configurado.')
    refresh()
  }

  async function handleEliminar(item: GastoRecurrente) {
    if (!confirm(`¿Eliminar el gasto recurrente "${item.descripcion}"?`)) return

    if (!isOnline()) {
      showError('Sin conexión. Conéctate a internet para eliminar gastos recurrentes.')
      return
    }

    setEliminandoId(item.id)

    const { error: deleteError } = await deleteGastoRecurrente(item.id)
    setEliminandoId(null)

    if (deleteError) {
      showError(`Error al eliminar: ${deleteError}`)
      return
    }

    showSuccess('Gasto recurrente eliminado.')
    refresh()
  }

  return (
    <section className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Gastos recurrentes</h2>
        <p className="text-sm text-slate-400">
          Pagos fijos que se registran automáticamente cada mes
        </p>
      </div>

      <GastosRecurrentesList
        items={items}
        cuentas={cuentas}
        cargando={cargando}
        error={error}
        eliminandoId={eliminandoId}
        onEdit={iniciarEdicion}
        onEliminar={handleEliminar}
      />

      <GastosRecurrentesForm
        form={form}
        editandoId={editandoId}
        guardando={guardando}
        categoriaOptions={categoriaOptions}
        cuentasDisponibles={cuentasDisponibles}
        cuentasLoading={cuentasLoading}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        onCancelEdicion={cancelarEdicion}
      />
    </section>
  )
})
