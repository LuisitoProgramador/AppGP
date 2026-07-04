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
  getMonthRange,
  isCurrentMonth,
  shiftMonth,
} from '../utils/date'
import { getQuincenaRange } from '../utils/quincena'
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
  const [gastoQuincenaBase, setGastoQuincenaBase] = useState(0)
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

      const { inicio, fin } = getMonthRange(selectedMonth)
      const limite = await getLimiteMensual(user.id)
      if (isMounted) {
        setLimiteMensual(limite)
      }

      if (lite) {
        if (isMounted) {
          setIngresoMensualTotal(null)
          setPatrimonioLiquido(null)
        }
      } else {
        const presupuestoData = await getPresupuesto(user.id)
        if (isMounted) {
          setIngresoMensualTotal(presupuestoData ? getIngresoMensualTotal(presupuestoData) : null)
        }

        const { data: cuentasData } = await listCuentas(user.id)
        if (isMounted) {
          setPatrimonioLiquido(
            cuentasData.length > 0 ? calcPatrimonioLiquido(cuentasData) : null,
          )
        }
      }

      const { data: recurrentesData } = await listGastosRecurrentes(user.id)
      if (isMounted) {
        setRecurrentes(recurrentesData)
      }

      const { data, error: queryError } = await supabase
        .from('gastos_resumen_mensual')
        .select('categoria, total, cantidad')
        .eq('user_id', user.id)
        .gte('mes', inicio.toISOString())
        .lt('mes', fin.toISOString())

      if (!isMounted) return

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

      if (isCurrentMonth(selectedMonth)) {
        const { inicio: qInicio, fin: qFin } = getQuincenaRange()
        const { data: quincenaData } = await supabase
          .from('gastos')
          .select('monto')
          .eq('user_id', user.id)
          .gte('fecha', qInicio.toISOString())
          .lt('fecha', qFin.toISOString())

        if (!isMounted) return

        setGastoQuincenaBase(
          (quincenaData ?? []).reduce((sum, row) => sum + Number(row.monto), 0),
        )
      } else if (isMounted) {
        setGastoQuincenaBase(0)
      }

      const ahora = new Date()
      const inicioMsi = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      const finMsi = shiftMonth(inicioMsi, 3)

      const { data: msiData } = await supabase
        .from('gastos')
        .select('monto, fecha')
        .eq('user_id', user.id)
        .eq('es_msi', true)
        .gte('fecha', inicioMsi.toISOString())
        .lt('fecha', finMsi.toISOString())

      if (!isMounted) return

      setGastosMsi(
        (msiData ?? []).map((item) => ({
          monto: Number(item.monto),
          fecha: item.fecha,
        })),
      )

      if (lite) {
        if (isMounted) {
          setEvolucionRows([])
          setGastoTotalResumen(null)
          setGastoTotalAntesResumen(null)
          setRecurrenteSugerido(null)
        }
        return
      }

      const inicioEvolucion = shiftMonth(inicioMsi, -3)
      const finEvolucion = shiftMonth(inicioMsi, 1)

      const { data: evoData } = await supabase
        .from('gastos_resumen_mensual')
        .select('mes, total')
        .eq('user_id', user.id)
        .gte('mes', inicioEvolucion.toISOString())
        .lt('mes', finEvolucion.toISOString())

      if (!isMounted) return

      const grouped = new Map<string, number>()
      for (const row of evoData ?? []) {
        const key = row.mes as string
        grouped.set(key, (grouped.get(key) ?? 0) + Number(row.total))
      }
      setEvolucionRows(
        Array.from(grouped.entries()).map(([mes, total]) => ({ mes, total })),
      )

      const mesResumen = mesParaResumenFinMes(selectedMonth)
      const { inicio: inicioResumen, fin: finResumen } = getMonthRange(mesResumen)
      const { data: resumenData } = await supabase
        .from('gastos_resumen_mensual')
        .select('total')
        .eq('user_id', user.id)
        .gte('mes', inicioResumen.toISOString())
        .lt('mes', finResumen.toISOString())

      if (!isMounted) return

      const totalResumen = (resumenData ?? []).reduce(
        (sum, row) => sum + Number(row.total),
        0,
      )
      setGastoTotalResumen(totalResumen)

      const mesAntesResumen = shiftMonth(mesResumen, -1)
      const { inicio: inicioAnt, fin: finAnt } = getMonthRange(mesAntesResumen)
      const { data: resumenAntData } = await supabase
        .from('gastos_resumen_mensual')
        .select('total')
        .eq('user_id', user.id)
        .gte('mes', inicioAnt.toISOString())
        .lt('mes', finAnt.toISOString())

      if (!isMounted) return

      setGastoTotalAntesResumen(
        (resumenAntData ?? []).reduce((sum, row) => sum + Number(row.total), 0),
      )

      const inicioPatron = shiftMonth(inicioMsi, -2)
      const { data: patronData } = await supabase
        .from('gastos')
        .select('descripcion, monto, categoria, fecha')
        .eq('user_id', user.id)
        .gte('fecha', inicioPatron.toISOString())
        .lt('fecha', finMsi.toISOString())

      if (!isMounted) return

      const sugeridos = detectarRecurrentesSugeridos(
        (patronData ?? []) as {
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
    gastoQuincenaBase,
    gastoTotalResumen,
    gastoTotalAntesResumen,
    recurrenteSugerido,
    setLimiteMensual,
    setRecurrenteSugerido,
  }
}
