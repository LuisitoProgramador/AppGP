import type { PendingIngreso } from '../types/ingreso'
import { isFechaInMonth } from './date'

function pendingIngresoMatchesMonth(ingreso: PendingIngreso, month: Date): boolean {
  return isFechaInMonth(new Date(ingreso.createdAt).toISOString(), month)
}

export function filterPendingIngresos(
  pending: PendingIngreso[],
  month: Date,
  categoriaFiltro: string,
  busqueda: string,
): PendingIngreso[] {
  if (categoriaFiltro !== 'Todas' && categoriaFiltro !== 'Ingreso') return []

  const q = busqueda.trim().toLowerCase()

  return pending.filter((ingreso) => {
    if (!pendingIngresoMatchesMonth(ingreso, month)) return false
    if (q && !ingreso.descripcion.toLowerCase().includes(q)) return false
    return true
  })
}
