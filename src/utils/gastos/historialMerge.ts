import type { HistorialItem } from '../../components/historial/historialTypes'
import { getHistorialItemKey } from '../../components/historial/historialTypes'
import { filterPendingIngresos } from './filterPendingIngresos'
import {
  filterOptimisticGastos,
  filterPendingGastos,
  filterPendingNotInOptimistic,
} from './optimisticGastos'
import type { OptimisticGasto, PendingGasto } from '../../types/gasto'
import type { PendingIngreso } from '../../types/ingreso'

function getFechaMs(item: HistorialItem): number {
  return Date.parse(item.fecha)
}

/** Merge O(n) de dos listas ya ordenadas por fecha desc (servidor o local reciente). */
export function mergePreSortedHistorial(
  left: HistorialItem[],
  right: HistorialItem[],
): HistorialItem[] {
  const merged: HistorialItem[] = []
  let i = 0
  let j = 0

  while (i < left.length && j < right.length) {
    const leftMs = getFechaMs(left[i])
    const rightMs = getFechaMs(right[j])
    if (leftMs > rightMs || (leftMs === rightMs && getHistorialItemKey(left[i]).localeCompare(getHistorialItemKey(right[j])) <= 0)) {
      merged.push(left[i])
      i += 1
    } else {
      merged.push(right[j])
      j += 1
    }
  }

  return merged.concat(left.slice(i), right.slice(j))
}

/** Páginas infinite query: cada página ya viene ordenada por Supabase (.order fecha desc). */
export function flattenPreSortedGastoPages(
  pages: { gastos: HistorialItem[] }[] | undefined,
): HistorialItem[] {
  return pages?.flatMap((page) => page.gastos) ?? []
}

export function buildLocalHistorialItems(
  optimisticGastos: OptimisticGasto[],
  pendingGastos: PendingGasto[],
  pendingIngresos: PendingIngreso[],
  selectedMonth: Date,
  categoriaFiltro: string,
  busqueda: string,
): HistorialItem[] {
  const pendientes: HistorialItem[] = filterPendingGastos(
    filterPendingNotInOptimistic(pendingGastos, optimisticGastos),
    selectedMonth,
    categoriaFiltro,
    busqueda,
  ).map((gasto) => ({
    ...gasto,
    pendiente: true as const,
  }))

  const optimistas: HistorialItem[] = filterOptimisticGastos(
    optimisticGastos,
    selectedMonth,
    categoriaFiltro,
    busqueda,
  ).map((gasto) => ({
    ...gasto,
    optimistic: true as const,
  }))

  const pendientesIngresos: HistorialItem[] = filterPendingIngresos(
    pendingIngresos,
    selectedMonth,
    categoriaFiltro,
    busqueda,
  ).map((ingreso) => ({
    ...ingreso,
    tipo: 'ingreso' as const,
    pendiente: true as const,
    fecha: new Date(ingreso.createdAt).toISOString(),
    categoria: 'Ingreso' as const,
  }))

  // Conjunto pequeño (offline/optimista); no afecta el historial paginado del servidor.
  return [...optimistas, ...pendientes, ...pendientesIngresos].sort((a, b) => {
    const diff = getFechaMs(b) - getFechaMs(a)
    if (diff !== 0) return diff
    return getHistorialItemKey(a).localeCompare(getHistorialItemKey(b))
  })
}

export function buildSyncedHistorialItems(
  pages: { gastos: HistorialItem[] }[] | undefined,
  ingresosItems: HistorialItem[],
  categoriaFiltro: string,
): HistorialItem[] {
  if (categoriaFiltro === 'Ingreso') {
    return ingresosItems
  }

  const gastos = flattenPreSortedGastoPages(pages)
  if (ingresosItems.length === 0) return gastos
  if (gastos.length === 0) return ingresosItems

  return mergePreSortedHistorial(gastos, ingresosItems)
}

export function buildHistorialItems(
  pages: { gastos: HistorialItem[] }[] | undefined,
  ingresosItems: HistorialItem[],
  categoriaFiltro: string,
  localItems: HistorialItem[],
): HistorialItem[] {
  const ingresosVisibles =
    categoriaFiltro === 'Todas' || categoriaFiltro === 'Ingreso' ? ingresosItems : []

  const synced = buildSyncedHistorialItems(pages, ingresosVisibles, categoriaFiltro)
  if (localItems.length === 0) return synced
  if (synced.length === 0) return localItems

  return mergePreSortedHistorial(localItems, synced)
}
