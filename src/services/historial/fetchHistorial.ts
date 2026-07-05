import { supabase } from '../supabase'
import { listIngresosCuenta } from '../cuentas/ingresos'
import { HISTORIAL_PAGE_SIZE } from '../../types/gasto'
import type { HistorialItem } from '../../components/historial/historialTypes'
import { getMonthFechaBounds } from '../../utils/date'

export interface FetchHistorialGastosParams {
  userId: string
  selectedMonth: Date
  categoriaFiltro: string
  busqueda: string
  page: number
}

export interface FetchHistorialGastosResult {
  gastos: HistorialItem[]
  ingresos: HistorialItem[]
  hasMore: boolean
  error: string | null
}

export async function fetchHistorialGastosPage({
  userId,
  selectedMonth,
  categoriaFiltro,
  busqueda,
  page,
}: FetchHistorialGastosParams): Promise<FetchHistorialGastosResult> {
  const { inicio, fin } = getMonthFechaBounds(selectedMonth)
  const from = page * HISTORIAL_PAGE_SIZE
  const to = from + HISTORIAL_PAGE_SIZE - 1

  let ingresos: HistorialItem[] = []

  if (page === 0 && (categoriaFiltro === 'Todas' || categoriaFiltro === 'Ingreso')) {
    const ingresosResult = await listIngresosCuenta(userId, inicio, fin)
    if (ingresosResult.error) {
      return { gastos: [], ingresos: [], hasMore: false, error: ingresosResult.error }
    }

    ingresos = (ingresosResult.data ?? [])
      .filter((ingreso) => {
        if (!busqueda.trim()) return true
        return ingreso.descripcion.toLowerCase().includes(busqueda.trim().toLowerCase())
      })
      .map((ingreso) => ({
        tipo: 'ingreso' as const,
        id: ingreso.id,
        monto: ingreso.monto,
        descripcion: ingreso.descripcion,
        fecha: ingreso.fecha,
        cuenta_id: ingreso.cuenta_id,
        categoria: 'Ingreso' as const,
      }))
  }

  if (categoriaFiltro === 'Ingreso') {
    return { gastos: [], ingresos, hasMore: false, error: null }
  }

  let query = supabase
    .from('gastos')
    .select('id, monto, categoria, descripcion, fecha, cuenta_id, es_msi, grupo_msi_id')
    .eq('user_id', userId)
    .gte('fecha', inicio)
    .lt('fecha', fin)
    .order('fecha', { ascending: false })
    .range(from, to)

  if (categoriaFiltro !== 'Todas' && categoriaFiltro !== 'Ingreso') {
    query = query.eq('categoria', categoriaFiltro)
  }

  if (busqueda.trim()) {
    query = query.ilike('descripcion', `%${busqueda.trim()}%`)
  }

  const gastosResult = await query

  if (gastosResult.error) {
    return { gastos: [], ingresos, hasMore: false, error: gastosResult.error.message }
  }

  const gastos = (gastosResult.data ?? []).map((gasto) => ({
    ...gasto,
    pendiente: false as const,
  }))

  return {
    gastos,
    ingresos,
    hasMore: gastos.length === HISTORIAL_PAGE_SIZE,
    error: null,
  }
}
