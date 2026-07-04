import { useEffect, useMemo, useState } from 'react'
import { useAuthSession, useGastosRefreshState } from '../../contexts'
import { getLimiteMensual, getPresupuesto, getIngresoMensualTotal } from '../../services/presupuesto'
import { listCuentas } from '../../services/cuentas'
import { supabase } from '../../services/supabase'
import { calcPatrimonioLiquido } from '../../utils/dashboard/patrimonioLiquido'
import {
  getMonthBucketBounds,
  getMonthFechaBounds,
  shiftMonth,
} from '../../utils/date'
import { mesParaResumenFinMes } from '../../utils/dashboard/resumenFinMes'
import type {
  DashboardQueryActions,
  DashboardQueryState,
  EvolucionRow,
  GastoMsiRow,
  ResumenMensual,
  UseDashboardDataOptions,
} from './dashboardTypes'
import { useDashboardRecurrentes } from './useDashboardRecurrentes'

function appendQueryError(errors: string[], label: string, message: string | undefined | null) {
  if (message) errors.push(`${label}: ${message}`)
}

export function useDashboardQueries(
  selectedMonth: Date,
  options: UseDashboardDataOptions = {},
): DashboardQueryState & DashboardQueryActions {
  const lite = options.lite ?? false
  const { user } = useAuthSession()
  const { refreshKey } = useGastosRefreshState()

  const [resumenMensual, setResumenMensual] = useState<ResumenMensual[]>([])
  const [limiteMensual, setLimiteMensual] = useState(10000)
  const [ingresoMensualTotal, setIngresoMensualTotal] = useState<number | null>(null)
  const [patrimonioLiquido, setPatrimonioLiquido] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gastosMsi, setGastosMsi] = useState<GastoMsiRow[]>([])
  const [evolucionRows, setEvolucionRows] = useState<EvolucionRow[]>([])
  const [gastoTotalResumen, setGastoTotalResumen] = useState<number | null>(null)
  const [gastoTotalAntesResumen, setGastoTotalAntesResumen] = useState<number | null>(null)
  const [patronGastos, setPatronGastos] = useState<
    { descripcion: string; monto: number; categoria: string; fecha: string }[]
  >([])

  const { recurrentes, recurrenteSugerido, setRecurrenteSugerido } = useDashboardRecurrentes(
    patronGastos,
    lite,
  )

  useEffect(() => {
    let isMounted = true

    if (!user) {
      setCargando(false)
      return () => {
        isMounted = false
      }
    }

    const userId = user.id

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
        resumenResult,
        msiResult,
      ] = await Promise.all([
        getLimiteMensual(userId),
        lite ? Promise.resolve(null) : getPresupuesto(userId),
        lite ? Promise.resolve({ data: [] as Awaited<ReturnType<typeof listCuentas>>['data'], error: null, fromCache: false }) : listCuentas(userId),
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

      if (!isMounted) return

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

      const partialErrors: string[] = []

      if (!lite && cuentasResult.error) {
        appendQueryError(partialErrors, 'Cuentas', cuentasResult.error)
        setPatrimonioLiquido(null)
      }

      const { data, error: queryError } = resumenResult

      if (queryError) {
        if (isMounted) {
          setError(queryError.message)
          setCargando(false)
        }
        return
      }

      setResumenMensual(
        (data ?? []).map((item) => ({
          categoria: item.categoria,
          total: Number(item.total),
          cantidad: Number(item.cantidad),
        })),
      )

      if (msiResult.error) {
        appendQueryError(partialErrors, 'Compromisos MSI', msiResult.error.message)
        setGastosMsi([])
      } else {
        setGastosMsi(
          (msiResult.data ?? []).map((item) => ({
            monto: Number(item.monto),
            fecha: item.fecha,
          })),
        )
      }

      if (lite) {
        setEvolucionRows([])
        setGastoTotalResumen(null)
        setGastoTotalAntesResumen(null)
        setPatronGastos([])
        if (isMounted) {
          setError(partialErrors.length > 0 ? partialErrors.join(' · ') : null)
          setCargando(false)
        }
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

      if (!isMounted) return

      if (evoResult.error) {
        appendQueryError(partialErrors, 'Evolución mensual', evoResult.error.message)
        setEvolucionRows([])
      } else {
        const grouped = new Map<string, number>()
        for (const row of evoResult.data ?? []) {
          const key = row.mes as string
          grouped.set(key, (grouped.get(key) ?? 0) + Number(row.total))
        }
        setEvolucionRows(
          Array.from(grouped.entries()).map(([mes, total]) => ({ mes, total })),
        )
      }

      if (resumenMesResult.error) {
        appendQueryError(partialErrors, 'Resumen del mes', resumenMesResult.error.message)
        setGastoTotalResumen(null)
      } else {
        const totalResumen = (resumenMesResult.data ?? []).reduce(
          (sum, row) => sum + Number(row.total),
          0,
        )
        setGastoTotalResumen(totalResumen)
      }

      if (resumenAntResult.error) {
        appendQueryError(partialErrors, 'Resumen mes anterior', resumenAntResult.error.message)
        setGastoTotalAntesResumen(null)
      } else {
        setGastoTotalAntesResumen(
          (resumenAntResult.data ?? []).reduce((sum, row) => sum + Number(row.total), 0),
        )
      }

      if (patronResult.error) {
        appendQueryError(partialErrors, 'Patrones de gasto', patronResult.error.message)
        setPatronGastos([])
      } else {
        setPatronGastos(
          (patronResult.data ?? []) as {
            descripcion: string
            monto: number
            categoria: string
            fecha: string
          }[],
        )
      }

      if (isMounted) {
        setError(partialErrors.length > 0 ? partialErrors.join(' · ') : null)
        setCargando(false)
      }
    }

    cargarDashboard()

    return () => {
      isMounted = false
    }
  }, [user, refreshKey, selectedMonth, lite])

  return useMemo(
    () => ({
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
    }),
    [
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
    ],
  )
}
