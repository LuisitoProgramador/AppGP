import { getLimiteMensual, getPresupuesto, getIngresoMensualTotal } from '../presupuesto'
import { listCuentas } from '../cuentas'
import { supabase } from '../supabase'
import { calcPatrimonioLiquido } from '../../utils/dashboard/patrimonioLiquido'
import {
  getMonthBucketBounds,
  getMonthFechaBounds,
  shiftMonth,
} from '../../utils/date'
import { mesParaResumenFinMes } from '../../utils/dashboard/resumenFinMes'
import type { EvolucionRow, GastoMsiRow, ResumenMensual } from '../../hooks/dashboard/dashboardTypes'

function appendQueryError(errors: string[], label: string, message: string | undefined | null) {
  if (message) errors.push(`${label}: ${message}`)
}

export interface DashboardFetchResult {
  resumenMensual: ResumenMensual[]
  limiteMensual: number
  ingresoMensualTotal: number | null
  porcentajeAhorro: number | null
  patrimonioLiquido: number | null
  gastosMsi: GastoMsiRow[]
  evolucionRows: EvolucionRow[]
  gastoTotalResumen: number | null
  gastoTotalAntesResumen: number | null
  patronGastos: { descripcion: string; monto: number; categoria: string; fecha: string }[]
  partialError: string | null
  fatalError: string | null
}

export async function fetchDashboardData(
  userId: string,
  selectedMonth: Date,
  lite: boolean,
): Promise<DashboardFetchResult> {
  const { inicio, fin } = getMonthBucketBounds(selectedMonth)
  const ahora = new Date()
  const inicioMsiDate = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const finMsiDate = shiftMonth(inicioMsiDate, 3)
  const msiBounds = getMonthFechaBounds(inicioMsiDate)
  const finMsiBounds = getMonthFechaBounds(finMsiDate)

  const partialErrors: string[] = []

  const [limite, presupuestoData, cuentasResult, resumenResult, msiResult] = await Promise.all([
    getLimiteMensual(userId),
    lite ? Promise.resolve(null) : getPresupuesto(userId),
    lite
      ? Promise.resolve({
          data: [] as Awaited<ReturnType<typeof listCuentas>>['data'],
          error: null,
          fromCache: false,
        })
      : listCuentas(userId),
    supabase
      .from('gastos_resumen_mensual')
      .select('categoria, total, cantidad')
      .eq('user_id', userId)
      .gte('mes', inicio)
      .lt('mes', fin),
    supabase
      .from('gastos')
      .select('monto, fecha')
      .eq('user_id', userId)
      .eq('es_msi', true)
      .gte('fecha', msiBounds.inicio)
      .lt('fecha', finMsiBounds.fin),
  ])

  if (resumenResult.error) {
    return {
      resumenMensual: [],
      limiteMensual: limite,
      ingresoMensualTotal: null,
      porcentajeAhorro: null,
      patrimonioLiquido: null,
      gastosMsi: [],
      evolucionRows: [],
      gastoTotalResumen: null,
      gastoTotalAntesResumen: null,
      patronGastos: [],
      partialError: null,
      fatalError: resumenResult.error.message,
    }
  }

  const resumenMensual = (resumenResult.data ?? []).map((item) => ({
    categoria: item.categoria,
    total: Number(item.total),
    cantidad: Number(item.cantidad),
  }))

  let ingresoMensualTotal: number | null = null
  let porcentajeAhorro: number | null = null
  let patrimonioLiquido: number | null = null

  if (!lite) {
    ingresoMensualTotal = presupuestoData ? getIngresoMensualTotal(presupuestoData) : null
    porcentajeAhorro = presupuestoData?.porcentaje_ahorro ?? null
    const cuentasData = cuentasResult.data ?? []
    patrimonioLiquido = cuentasData.length > 0 ? calcPatrimonioLiquido(cuentasData) : null
    if (cuentasResult.error) {
      appendQueryError(partialErrors, 'Cuentas', cuentasResult.error)
      patrimonioLiquido = null
    }
  }

  let gastosMsi: GastoMsiRow[] = []
  if (msiResult.error) {
    appendQueryError(partialErrors, 'Compromisos MSI', msiResult.error.message)
  } else {
    gastosMsi = (msiResult.data ?? []).map((item) => ({
      monto: Number(item.monto),
      fecha: item.fecha,
    }))
  }

  if (lite) {
    return {
      resumenMensual,
      limiteMensual: limite,
      ingresoMensualTotal,
      porcentajeAhorro,
      patrimonioLiquido,
      gastosMsi,
      evolucionRows: [],
      gastoTotalResumen: null,
      gastoTotalAntesResumen: null,
      patronGastos: [],
      partialError: partialErrors.length > 0 ? partialErrors.join(' · ') : null,
      fatalError: null,
    }
  }

  const inicioEvolucion = shiftMonth(inicioMsiDate, -3)
  const finEvolucion = shiftMonth(inicioMsiDate, 1)
  const evoInicio = getMonthBucketBounds(inicioEvolucion)
  const evoFin = getMonthBucketBounds(finEvolucion)

  const mesResumen = mesParaResumenFinMes(selectedMonth)
  const resumenBounds = getMonthBucketBounds(mesResumen)
  const mesAntesResumen = shiftMonth(mesResumen, -1)
  const antBounds = getMonthBucketBounds(mesAntesResumen)
  const inicioPatron = shiftMonth(inicioMsiDate, -2)
  const patronBounds = getMonthFechaBounds(inicioPatron)

  const [evoResult, resumenMesResult, resumenAntResult, patronResult] = await Promise.all([
    supabase
      .from('gastos_resumen_mensual')
      .select('mes, total')
      .eq('user_id', userId)
      .gte('mes', evoInicio.inicio)
      .lt('mes', evoFin.fin),
    supabase
      .from('gastos_resumen_mensual')
      .select('total')
      .eq('user_id', userId)
      .gte('mes', resumenBounds.inicio)
      .lt('mes', resumenBounds.fin),
    supabase
      .from('gastos_resumen_mensual')
      .select('total')
      .eq('user_id', userId)
      .gte('mes', antBounds.inicio)
      .lt('mes', antBounds.fin),
    supabase
      .from('gastos')
      .select('descripcion, monto, categoria, fecha')
      .eq('user_id', userId)
      .gte('fecha', patronBounds.inicio)
      .lt('fecha', finMsiBounds.fin),
  ])

  let evolucionRows: EvolucionRow[] = []
  if (evoResult.error) {
    appendQueryError(partialErrors, 'Evolución mensual', evoResult.error.message)
  } else {
    const grouped = new Map<string, number>()
    for (const row of evoResult.data ?? []) {
      const key = row.mes as string
      grouped.set(key, (grouped.get(key) ?? 0) + Number(row.total))
    }
    evolucionRows = Array.from(grouped.entries()).map(([mes, total]) => ({ mes, total }))
  }

  let gastoTotalResumen: number | null = null
  if (resumenMesResult.error) {
    appendQueryError(partialErrors, 'Resumen del mes', resumenMesResult.error.message)
  } else {
    gastoTotalResumen = (resumenMesResult.data ?? []).reduce(
      (sum, row) => sum + Number(row.total),
      0,
    )
  }

  let gastoTotalAntesResumen: number | null = null
  if (resumenAntResult.error) {
    appendQueryError(partialErrors, 'Resumen mes anterior', resumenAntResult.error.message)
  } else {
    gastoTotalAntesResumen = (resumenAntResult.data ?? []).reduce(
      (sum, row) => sum + Number(row.total),
      0,
    )
  }

  let patronGastos: DashboardFetchResult['patronGastos'] = []
  if (patronResult.error) {
    appendQueryError(partialErrors, 'Patrones de gasto', patronResult.error.message)
  } else {
    patronGastos = (patronResult.data ?? []) as DashboardFetchResult['patronGastos']
  }

  return {
    resumenMensual,
    limiteMensual: limite,
    ingresoMensualTotal,
    porcentajeAhorro,
    patrimonioLiquido,
    gastosMsi,
    evolucionRows,
    gastoTotalResumen,
    gastoTotalAntesResumen,
    patronGastos,
    partialError: partialErrors.length > 0 ? partialErrors.join(' · ') : null,
    fatalError: null,
  }
}
