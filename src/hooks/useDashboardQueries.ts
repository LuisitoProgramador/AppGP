import { useEffect, useState } from 'react'
import { useAuthContext, useGastosData } from '../contexts'
import { getLimiteMensual, getPresupuesto, getIngresoMensualTotal } from '../services/presupuesto'
import { listCuentas } from '../services/cuentas'
import { listGastosRecurrentes } from '../services/gastosRecurrentes'
import { supabase } from '../services/supabase'
import type { GastoRecurrente } from '../types/gasto'
import {
  detectarRecurrentesSugeridos,
  isRecurrenteSugeridoDismissed,
  type RecurrenteSugerido,
} from '../utils/detectarRecurrentes'
import { calcPatrimonioLiquido } from '../utils/patrimonioLiquido'
import {
  getMonthBucketBounds,
  getMonthFechaBounds,
  shiftMonth,
} from '../utils/date'
import { mesParaResumenFinMes } from '../utils/resumenFinMes'
import type {
  DashboardQueryActions,
  DashboardQueryState,
  EvolucionRow,
  GastoMsiRow,
  ResumenMensual,
  UseDashboardDataOptions,
} from './dashboardTypes'

export function useDashboardQueries(
  selectedMonth: Date,
  options: UseDashboardDataOptions = {},
): DashboardQueryState & DashboardQueryActions {
  const lite = options.lite ?? false
  const { user } = useAuthContext()
  const { refreshKey } = useGastosData()

  const [resumenMensual, setResumenMensual] = useState<ResumenMensual[]>([])
  const [limiteMensual, setLimiteMensual] = useState(10000)
  const [ingresoMensualTotal, setIngresoMensualTotal] = useState<number | null>(null)
  const [patrimonioLiquido, setPatrimonioLiquido] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gastosMsi, setGastosMsi] = useState<GastoMsiRow[]>([])
  const [evolucionRows, setEvolucionRows] = useState<EvolucionRow[]>([])
  const [recurrentes, setRecurrentes] = useState<GastoRecurrente[]>([])
  const [gastoTotalResumen, setGastoTotalResumen] = useState<number | null>(null)
  const [gastoTotalAntesResumen, setGastoTotalAntesResumen] = useState<number | null>(null)
  const [recurrenteSugerido, setRecurrenteSugerido] = useState<RecurrenteSugerido | null>(null)

  useEffect(() => {
    let isMounted = true

    if (!user) {
      return () => {
        isMounted = false
      }
    }

    async function cargarDashboard() {
      if (isMounted) {
        setCargando(true)
        setError(null)
      }

      const { inicio, fin } = getMonthBucketBounds(selectedMonth)
      const ahora = new Date()
      const inicioMsiDate = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      const finMsiDate = shiftMonth(inicioMsiDate, 3)
      const msiBounds = getMonthFechaBounds(inicioMsiDate)
      const finMsiBounds = getMonthFechaBounds(finMsiDate)

      const [
        limite,
        presupuestoData,
        cuentasResult,
        recurrentesResult,
        resumenResult,
        msiResult,
      ] = await Promise.all([
        getLimiteMensual(user.id),
        lite ? Promise.resolve(null) : getPresupuesto(user.id),
        lite ? Promise.resolve({ data: [] as Awaited<ReturnType<typeof listCuentas>>['data'] }) : listCuentas(user.id),
        listGastosRecurrentes(user.id),
        supabase
          .from('gastos_resumen_mensual')
          .select('categoria, total, cantidad')
          .eq('user_id', user.id)
          .gte('mes', inicio)
          .lt('mes', fin),
        supabase
          .from('gastos')
          .select('monto, fecha')
          .eq('user_id', user.id)
          .eq('es_msi', true)
          .gte('fecha', msiBounds.inicio)
          .lt('fecha', finMsiBounds.fin),
      ])

      if (!isMounted) return

      const recurrentesData = recurrentesResult.data

      setLimiteMensual(limite)

      if (lite) {
        setIngresoMensualTotal(null)
        setPatrimonioLiquido(null)
      } else {
        setIngresoMensualTotal(presupuestoData ? getIngresoMensualTotal(presupuestoData) : null)
        const cuentasData = cuentasResult.data ?? []
        setPatrimonioLiquido(
          cuentasData.length > 0 ? calcPatrimonioLiquido(cuentasData) : null,
        )
      }

      setRecurrentes(recurrentesData)

      const { data, error: queryError } = resumenResult

      setCargando(false)

      if (queryError) {
        setError(queryError.message)
        return
      }

      setResumenMensual(
        (data ?? []).map((item) => ({
          categoria: item.categoria,
          total: Number(item.total),
          cantidad: Number(item.cantidad),
        })),
      )

      setGastosMsi(
        (msiResult.data ?? []).map((item) => ({
          monto: Number(item.monto),
          fecha: item.fecha,
        })),
      )

      if (lite) {
        setEvolucionRows([])
        setGastoTotalResumen(null)
        setGastoTotalAntesResumen(null)
        setRecurrenteSugerido(null)
        return
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
          .eq('user_id', user.id)
          .gte('mes', evoInicio.inicio)
          .lt('mes', evoFin.fin),
        supabase
          .from('gastos_resumen_mensual')
          .select('total')
          .eq('user_id', user.id)
          .gte('mes', resumenBounds.inicio)
          .lt('mes', resumenBounds.fin),
        supabase
          .from('gastos_resumen_mensual')
          .select('total')
          .eq('user_id', user.id)
          .gte('mes', antBounds.inicio)
          .lt('mes', antBounds.fin),
        supabase
          .from('gastos')
          .select('descripcion, monto, categoria, fecha')
          .eq('user_id', user.id)
          .gte('fecha', patronBounds.inicio)
          .lt('fecha', finMsiBounds.fin),
      ])

      if (!isMounted) return

      const grouped = new Map<string, number>()
      for (const row of evoResult.data ?? []) {
        const key = row.mes as string
        grouped.set(key, (grouped.get(key) ?? 0) + Number(row.total))
      }
      setEvolucionRows(
        Array.from(grouped.entries()).map(([mes, total]) => ({ mes, total })),
      )

      const totalResumen = (resumenMesResult.data ?? []).reduce(
        (sum, row) => sum + Number(row.total),
        0,
      )
      setGastoTotalResumen(totalResumen)

      setGastoTotalAntesResumen(
        (resumenAntResult.data ?? []).reduce((sum, row) => sum + Number(row.total), 0),
      )

      const sugeridos = detectarRecurrentesSugeridos(
        (patronResult.data ?? []) as {
          descripcion: string
          monto: number
          categoria: string
          fecha: string
        }[],
        recurrentesData,
      ).filter((item) => !isRecurrenteSugeridoDismissed(item.descripcion))

      setRecurrenteSugerido(sugeridos[0] ?? null)
    }

    cargarDashboard()

    return () => {
      isMounted = false
    }
  }, [user, refreshKey, selectedMonth, lite])

  return {
    cargando,
    error,
    resumenMensual,
    limiteMensual,
    ingresoMensualTotal,
    patrimonioLiquido,
    recurrentes,
    gastosMsi,
    evolucionRows,
    gastoTotalResumen,
    gastoTotalAntesResumen,
    recurrenteSugerido,
    setRecurrenteSugerido,
  }
}
