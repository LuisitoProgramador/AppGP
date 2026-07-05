import { useState, useCallback } from 'react'
import {
  useAuthSession,
  useCuentas,
  useGastosRefreshState,
  useOptimisticGastosState,
} from '../../contexts'
import { addPendingGasto, removePendingGasto, removePendingIngreso } from '../../services/sync/offlineQueue'
import { GASTO_QUERY_SCOPES, INGRESO_QUERY_SCOPES } from '../../lib/invalidateAppQueries'
import { supabase } from '../../services/supabase'
import type { Gasto, PendingGasto } from '../../types/gasto'
import {
  isHistorialPending,
  isHistorialPendingIngreso,
  getHistorialAccionId,
  type HistorialItem,
} from '../../components/historial/historialTypes'
import { showError, showInfo, showSuccess, showSuccessWithUndo } from '../../utils/core/toast'
import {
  buildGastoEliminadoSnapshot,
  montoSaldoAlRestaurar,
  type GastoEliminadoSnapshot,
} from '../../utils/gastos/historialUndo'
import { montoSaldoAlEliminarPendiente, saldoRevertAlEliminar } from '../../utils/gastos/gastoSaldo'
import { parseMsiDescripcion } from '../../utils/gastos/msi'
import type { EditGastoModo } from '../../components/editGasto/types'

export function useHistorialActions() {
  const { user } = useAuthSession()
  const { refresh } = useGastosRefreshState()
  const { removeOptimisticGastos, addOptimisticGasto } = useOptimisticGastosState()
  const { revertGastoSaldo, applyGastoSaldo } = useCuentas()
  const [accionId, setAccionId] = useState<string | number | null>(null)
  const [gastoEditando, setGastoEditando] = useState<Gasto | null>(null)
  const [editModo, setEditModo] = useState<EditGastoModo>('cuota')

  const abrirEdicion = useCallback((gastoItem: Gasto, modo: EditGastoModo) => {
    setEditModo(modo)
    setGastoEditando(gastoItem)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setGastoEditando(null)
    setEditModo('cuota')
  }, [])

  const restaurarGastoEliminado = useCallback(
    async (snapshot: GastoEliminadoSnapshot) => {
      const { error: insertError } = await supabase.from('gastos').insert(snapshot.row)
      if (insertError) {
        showError(`No se pudo restaurar: ${insertError.message}`)
        return
      }

      const cuentaId = snapshot.saldoAplicado?.cuentaId ?? snapshot.row.cuenta_id
      if (cuentaId && snapshot.saldoAplicado) {
        const montoSaldo = montoSaldoAlRestaurar(snapshot)
        const { error: saldoError } = await applyGastoSaldo(cuentaId, montoSaldo)
        if (saldoError) {
          showError(`Gasto restaurado, pero el saldo no se actualizó: ${saldoError}`)
          refresh(GASTO_QUERY_SCOPES)
          return
        }
      }

      refresh(GASTO_QUERY_SCOPES)
      showInfo('Gasto restaurado.')
    },
    [applyGastoSaldo, refresh],
  )

  const restaurarGastoPendiente = useCallback(
    async (pending: PendingGasto) => {
      if (!user) return

      const rows =
        pending.msiInstallments ??
        [
          {
            monto: pending.monto,
            categoria: pending.categoria,
            descripcion: pending.descripcion,
            fecha: pending.fecha,
            cuenta_id: pending.cuenta_id ?? null,
            es_msi: pending.es_msi ?? false,
            grupo_msi_id: pending.grupo_msi_id ?? null,
          },
        ]

      const tempIds = rows.map((row) =>
        addOptimisticGasto({
          monto: row.monto,
          categoria: row.categoria,
          descripcion: row.descripcion,
          fecha: row.fecha,
          cuenta_id: row.cuenta_id,
          es_msi: row.es_msi,
          grupo_msi_id: row.grupo_msi_id,
        }),
      )

      await addPendingGasto({
        userId: user.id,
        monto: pending.monto,
        categoria: pending.categoria,
        descripcion: pending.descripcion,
        fecha: pending.fecha,
        cuenta_id: pending.cuenta_id,
        es_msi: pending.es_msi,
        grupo_msi_id: pending.grupo_msi_id,
        msiInstallments: pending.msiInstallments,
        optimisticTempIds: tempIds,
      })

      if (pending.cuenta_id) {
        const montoSaldo = montoSaldoAlEliminarPendiente(pending)
        const { error: saldoError } = await applyGastoSaldo(pending.cuenta_id, montoSaldo)
        if (saldoError) {
          showError(`Gasto restaurado, pero el saldo no se actualizó: ${saldoError}`)
        }
      }

      refresh(GASTO_QUERY_SCOPES)
      showInfo('Gasto restaurado.')
    },
    [addOptimisticGasto, applyGastoSaldo, refresh, user],
  )

  const handleEliminar = useCallback(
    async (item: HistorialItem) => {
      if ('optimistic' in item && item.optimistic) return

      const etiqueta = item.descripcion || item.categoria
      const mensajeMsi =
        'es_msi' in item && item.es_msi && item.grupo_msi_id
          ? `¿Eliminar solo esta cuota MSI de "${etiqueta}"? Las demás cuotas del plan no se borran.`
          : `¿Eliminar el gasto "${etiqueta}"?`
      if (!confirm(mensajeMsi)) return

      setAccionId(getHistorialAccionId(item) ?? null)

      if (isHistorialPendingIngreso(item)) {
        const { error: saldoError } = await applyGastoSaldo(item.cuenta_id, item.monto)
        if (saldoError) {
          setAccionId(null)
          showError(`No se pudo revertir el saldo: ${saldoError}`)
          return
        }
        await removePendingIngreso(item.id)
        setAccionId(null)
        refresh(INGRESO_QUERY_SCOPES)
        showSuccess('Ingreso pendiente eliminado.')
        return
      }

      if (isHistorialPending(item)) {
        const pendingBackup = { ...item }
        if (item.cuenta_id) {
          const montoRevert = montoSaldoAlEliminarPendiente(item)
          const { error: saldoError } = await revertGastoSaldo(item.cuenta_id, montoRevert)
          if (saldoError) {
            setAccionId(null)
            showError(`No se pudo revertir el saldo: ${saldoError}`)
            return
          }
        }
        if (item.optimisticTempIds?.length) {
          removeOptimisticGastos(item.optimisticTempIds)
        }
        await removePendingGasto(item.id)
        setAccionId(null)
        refresh(GASTO_QUERY_SCOPES)
        const esMsi = Boolean(pendingBackup.msiInstallments?.length)
        showSuccessWithUndo(
          esMsi ? 'Compra MSI pendiente eliminada.' : 'Gasto pendiente eliminado.',
          () => restaurarGastoPendiente(pendingBackup),
        )
        return
      }

      let saldoRevert = saldoRevertAlEliminar(item, [{ id: item.id, monto: item.monto }])
      if ('es_msi' in item && item.es_msi && user) {
        if (item.grupo_msi_id) {
          const { data: grupoRows } = await supabase
            .from('gastos')
            .select('id, monto, total_compra_msi')
            .eq('grupo_msi_id', item.grupo_msi_id)
          if (grupoRows) {
            saldoRevert = saldoRevertAlEliminar(item, grupoRows)
          }
        } else if (item.cuenta_id) {
          const parsed = item.descripcion ? parseMsiDescripcion(item.descripcion) : null
          let legacyQuery = supabase
            .from('gastos')
            .select('id, monto')
            .eq('user_id', user.id)
            .eq('es_msi', true)
            .eq('cuenta_id', item.cuenta_id)

          legacyQuery = parsed
            ? legacyQuery.ilike('descripcion', `${parsed.base} (MSI %`)
            : legacyQuery.eq('descripcion', item.descripcion ?? '')

          const { data: legacyRows } = await legacyQuery
          if (legacyRows?.length) {
            saldoRevert = saldoRevertAlEliminar(item, legacyRows)
          }
        }
      }

      const snapshot = buildGastoEliminadoSnapshot(item, saldoRevert)

      const { error: deleteError } = await supabase.from('gastos').delete().eq('id', item.id)

      setAccionId(null)

      if (deleteError) {
        showError(`Error al eliminar: ${deleteError.message}`)
        return
      }

      if (saldoRevert) {
        const { error: saldoError } = await revertGastoSaldo(
          saldoRevert.cuentaId,
          saldoRevert.monto,
        )
        if (saldoError) {
          showError(`Gasto eliminado, pero el saldo no se actualizó: ${saldoError}`)
          refresh(GASTO_QUERY_SCOPES)
          return
        }
      }

      refresh(GASTO_QUERY_SCOPES)
      showSuccessWithUndo(
        'es_msi' in item && item.es_msi ? 'Cuota MSI eliminada.' : 'Gasto eliminado.',
        () => restaurarGastoEliminado(snapshot),
      )
    },
    [refresh, removeOptimisticGastos, restaurarGastoEliminado, restaurarGastoPendiente, revertGastoSaldo, user],
  )

  return {
    accionId,
    handleEliminar,
    abrirEdicion,
    handleCloseEdit,
    gastoEditando,
    editModo,
  }
}
