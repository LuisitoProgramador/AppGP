import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthContext, useGastosData, useOfflineSync, useQuietMode } from '../contexts'
import { usePresupuestoDiario } from './usePresupuestoDiario'
import { useStableArray } from './useStableArray'
import { getLimiteMensual, getPresupuesto, getIngresoMensualTotal, saveLimiteMensual } from '../services/presupuesto'
import { getDefaultCuentaId, listCuentas } from '../services/cuentas'
import { listGastosRecurrentes, createGastoRecurrente } from '../services/gastosRecurrentes'
import { supabase } from '../services/supabase'
import type { GastoRecurrente } from '../types/gasto'
import type { MetaAhorro } from '../types/metaAhorro'
import { agruparPorCategoria } from '../utils/agruparPorCategoria'
import { formatCurrency } from '../utils/formatCurrency'
import {
  formatMonthLabel,
  getDaysRemainingInMonth,
  getMonthRange,
  getQuincenaPeriodo,
  isCurrentMonth,
  shiftMonth,
} from '../utils/date'
import { buildEvolucionMensual } from '../utils/evolucionMensual'
import { mergeResumenWithOptimistic, expandPendingToLineItems, filterPendingNotInOptimistic } from '../utils/optimisticGastos'
import { calcularCompromisosMsi } from '../utils/msiCompromisos'
import { calcularSaludAhorro } from '../utils/saludAhorro'
import { shouldShowBurnRateAlert } from '../utils/burnRate'
import { isDateInQuincena, getQuincenaRange } from '../utils/quincena'
import { isVistaQuincenal, setVistaQuincenal } from '../utils/vistaQuincenal'
import { proyectarDiaAgotamiento } from '../utils/limitProjection'
import { calcProyeccionCierre } from '../utils/proyeccionCierre'
import {
  buildResumenFinMes,
  mesParaResumenFinMes,
  shouldShowResumenFinMes,
} from '../utils/resumenFinMes'
import {
  detectarRecurrentesSugeridos,
  dismissRecurrenteSugerido,
  isRecurrenteSugeridoDismissed,
  type RecurrenteSugerido,
} from '../utils/detectarRecurrentes'
import { calcPatrimonioLiquido } from '../utils/patrimonioLiquido'
import { isModoViaje, setModoViaje } from '../utils/travelMode'
import { showError, showSuccess } from '../utils/toast'
import { validateMonto } from '../utils/validation'

interface ResumenMensual {
  categoria: string
  total: number
  cantidad: number
}

export interface UseDashboardDataOptions {
  lite?: boolean
}

export function useDashboardData(
  selectedMonth: Date,
  metas: MetaAhorro[] = [],
  options: UseDashboardDataOptions = {},
) {
  const lite = options.lite ?? false
  const { user } = useAuthContext()
  const { refreshKey, optimisticGastos, refresh } = useGastosData()
  const { pendingGastos } = useOfflineSync()
  const { modoTranquilo, reportDisponible } = useQuietMode()

  const [resumenMensual, setResumenMensual] = useState<ResumenMensual[]>([])
  const [limiteMensual, setLimiteMensual] = useState(10000)
  const [ingresoMensualTotal, setIngresoMensualTotal] = useState<number | null>(null)
  const [patrimonioLiquido, setPatrimonioLiquido] = useState<number | null>(null)
  const [limiteInput, setLimiteInput] = useState('10000')
  const [guardandoLimite, setGuardandoLimite] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gastosMsi, setGastosMsi] = useState<{ monto: number; fecha: string }[]>([])
  const [evolucionRows, setEvolucionRows] = useState<{ mes: string; total: number }[]>([])
  const [recurrentes, setRecurrentes] = useState<GastoRecurrente[]>([])
  const [modoViaje, setModoViajeState] = useState(() => isModoViaje())
  const [gastoTotalResumen, setGastoTotalResumen] = useState<number | null>(null)
  const [gastoTotalAntesResumen, setGastoTotalAntesResumen] = useState<number | null>(null)
  const [recurrenteSugerido, setRecurrenteSugerido] = useState<RecurrenteSugerido | null>(null)
  const [marcandoRecurrente, setMarcandoRecurrente] = useState(false)
  const [vistaQuincenal, setVistaQuincenalState] = useState(() => isVistaQuincenal())
  const [gastoQuincenaBase, setGastoQuincenaBase] = useState(0)

  const mesLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth])
  const esMesActual = useMemo(() => isCurrentMonth(selectedMonth), [selectedMonth])

  const resumen = useMemo(
    () =>
      agruparPorCategoria(
        mergeResumenWithOptimistic(
          resumenMensual,
          optimisticGastos,
          selectedMonth,
          pendingGastos,
        ),
      ),
    [resumenMensual, optimisticGastos, pendingGastos, selectedMonth],
  )

  const gastoTotal = useMemo(
    () => resumen.reduce((sum, item) => sum + item.total, 0),
    [resumen],
  )

  const diasRestantes = useMemo(
    () => (esMesActual ? getDaysRemainingInMonth(selectedMonth) : 0),
    [esMesActual, selectedMonth],
  )

  const quincenaPeriodo = useMemo(
    () => (esMesActual ? getQuincenaPeriodo() : null),
    [esMesActual],
  )

  const gastoQuincena = useMemo(() => {
    const optimistic = optimisticGastos
      .filter((gasto) => isDateInQuincena(gasto.fecha))
      .reduce((sum, gasto) => sum + gasto.monto, 0)

    const pending = filterPendingNotInOptimistic(pendingGastos, optimisticGastos)
      .flatMap(expandPendingToLineItems)
      .filter((gasto) => isDateInQuincena(gasto.fecha))
      .reduce((sum, gasto) => sum + gasto.monto, 0)

    return gastoQuincenaBase + optimistic + pending
  }, [gastoQuincenaBase, optimisticGastos, pendingGastos])

  const diaActual = useMemo(() => new Date().getDate(), [])

  const stableRecurrentes = useStableArray(recurrentes)
  const stableGastosMsi = useStableArray(gastosMsi)
  const stableOptimisticGastos = useStableArray(optimisticGastos)
  const stablePendingGastos = useStableArray(pendingGastos)

  const presupuesto = usePresupuestoDiario({
    limiteMensual,
    gastoTotal,
    gastoQuincena,
    recurrentes: stableRecurrentes,
    gastosMsi: stableGastosMsi,
    optimisticGastos: stableOptimisticGastos,
    pendingGastos: stablePendingGastos,
    vistaQuincenal,
    esMesActual,
    diaActual,
  })

  const disponible = presupuesto.disponible
  const presupuestoDiario = presupuesto.presupuestoDiario
  const diasRestantesEfectivos = presupuesto.diasRestantesEfectivos
  const recibosEfectivos = presupuesto.recibosEfectivos
  const msiPendientes = presupuesto.msiPendientes

  useEffect(() => {
    if (esMesActual && !cargando) {
      reportDisponible(disponible)
    } else {
      reportDisponible(null)
    }
  }, [disponible, esMesActual, cargando, reportDisponible])

  const focusView = useMemo(
    () => ({
      presupuestoDiario: formatCurrency(presupuestoDiario),
      disponible: formatCurrency(disponible),
      puedeGastar: disponible >= 0 || modoTranquilo,
    }),
    [presupuestoDiario, disponible, modoTranquilo],
  )

  const burnRateAlerta = useMemo(
    () =>
      !modoViaje &&
      !modoTranquilo &&
      esMesActual &&
      shouldShowBurnRateAlert(gastoTotal, limiteMensual, diaActual),
    [modoViaje, modoTranquilo, esMesActual, gastoTotal, limiteMensual, diaActual],
  )

  const diaAgotamiento = useMemo(
    () =>
      !modoViaje && !modoTranquilo && esMesActual
        ? proyectarDiaAgotamiento(gastoTotal, limiteMensual, diaActual)
        : null,
    [modoViaje, modoTranquilo, esMesActual, gastoTotal, limiteMensual, diaActual],
  )

  const proyeccionCierre = useMemo(
    () =>
      esMesActual
        ? calcProyeccionCierre({
            limiteMensual,
            gastoTotal,
            diaActual,
            diasRestantes,
          })
        : null,
    [esMesActual, limiteMensual, gastoTotal, diaActual, diasRestantes],
  )

  const mostrarResumenFinMes = useMemo(
    () => shouldShowResumenFinMes(selectedMonth),
    [selectedMonth],
  )

  const resumenFinMes = useMemo(() => {
    if (!mostrarResumenFinMes || gastoTotalResumen == null) return null
    return buildResumenFinMes({
      mes: mesParaResumenFinMes(selectedMonth),
      gastoTotalMes: gastoTotalResumen,
      gastoTotalMesAnterior: gastoTotalAntesResumen,
      metas,
    })
  }, [
    mostrarResumenFinMes,
    gastoTotalResumen,
    gastoTotalAntesResumen,
    metas,
    selectedMonth,
  ])

  const saludAhorro = useMemo(
    () =>
      calcularSaludAhorro({
        metas,
        gastoTotal,
        limiteMensual,
        disponible,
      }),
    [metas, gastoTotal, limiteMensual, disponible],
  )

  const compromisosMsi = useMemo(
    () =>
      calcularCompromisosMsi(
        gastosMsi,
        optimisticGastos,
        limiteMensual,
        undefined,
        3,
        pendingGastos,
      ),
    [gastosMsi, optimisticGastos, limiteMensual, pendingGastos],
  )

  const evolucionMensual = useMemo(
    () => buildEvolucionMensual(evolucionRows, optimisticGastos),
    [evolucionRows, optimisticGastos],
  )

  const tieneDatosAnalisis =
    resumen.length > 0 || evolucionMensual.some((item) => item.total > 0)

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
        setLimiteInput(String(limite))
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

  const handleGuardarLimite = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!user) return

      const limiteError = validateMonto(limiteInput)
      if (limiteError) {
        showError(limiteError)
        return
      }

      const limite = Number(limiteInput)
      setGuardandoLimite(true)
      const { error: saveError } = await saveLimiteMensual(user.id, limite)
      setGuardandoLimite(false)

      if (saveError) {
        showError(`Error al guardar límite: ${saveError}`)
        return
      }

      setLimiteMensual(limite)
      showSuccess('Límite mensual guardado.')
    },
    [user, limiteInput],
  )

  const handleToggleModoViaje = useCallback(() => {
    const activo = !modoViaje
    setModoViajeState(activo)
    setModoViaje(activo)
  }, [modoViaje])

  const handleToggleVistaQuincenal = useCallback(() => {
    const activo = !vistaQuincenal
    setVistaQuincenalState(activo)
    setVistaQuincenal(activo)
  }, [vistaQuincenal])

  const handleMarcarRecurrente = useCallback(async () => {
    if (!recurrenteSugerido || !user) return

    setMarcandoRecurrente(true)

    const { data: cuentasData } = await listCuentas(user.id)
    const cuentaId = getDefaultCuentaId(cuentasData)

    const { error: createError } = await createGastoRecurrente({
      descripcion: recurrenteSugerido.descripcion,
      monto: recurrenteSugerido.monto,
      categoria: recurrenteSugerido.categoria,
      dia_mes: recurrenteSugerido.dia_mes,
      cuenta_id: cuentaId,
    })
    setMarcandoRecurrente(false)

    if (createError) {
      showError(`No se pudo crear el recurrente: ${createError}`)
      return
    }

    dismissRecurrenteSugerido(recurrenteSugerido.descripcion)
    setRecurrenteSugerido(null)
    showSuccess('Gasto recurrente configurado.')
    refresh()
  }, [recurrenteSugerido, user, refresh])

  const handleDescartarRecurrente = useCallback(() => {
    if (!recurrenteSugerido) return
    dismissRecurrenteSugerido(recurrenteSugerido.descripcion)
    setRecurrenteSugerido(null)
  }, [recurrenteSugerido])

  return {
    cargando,
    error,
    esMesActual,
    mesLabel,
    gastoTotal,
    resumen,
    limiteMensual,
    limiteInput,
    setLimiteInput,
    guardandoLimite,
    ingresoMensualTotal,
    patrimonioLiquido,
    disponible,
    presupuestoDiario,
    diasRestantesEfectivos,
    recibosEfectivos,
    msiPendientes,
    quincenaPeriodo,
    vistaQuincenal,
    modoViaje,
    focusView,
    burnRateAlerta,
    diaAgotamiento,
    proyeccionCierre,
    resumenFinMes,
    saludAhorro,
    compromisosMsi,
    evolucionMensual,
    tieneDatosAnalisis,
    recurrenteSugerido,
    marcandoRecurrente,
    handleGuardarLimite,
    handleToggleModoViaje,
    handleToggleVistaQuincenal,
    handleMarcarRecurrente,
    handleDescartarRecurrente,
  }
}
