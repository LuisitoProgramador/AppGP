import { lazy, Suspense, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthContext, useGastosRefresh } from '../contexts'
import { getLimiteMensual, saveLimiteMensual } from '../services/presupuesto'
import { listGastosRecurrentes, createGastoRecurrente } from '../services/gastosRecurrentes'
import {
  addAhorroToMeta,
  createMetaAhorro,
  listMetasAhorro,
} from '../services/metasAhorro'
import { supabase } from '../services/supabase'
import { COLORES_CATEGORIA, type GastoRecurrente } from '../types/gasto'
import type { MetaAhorro } from '../types/metaAhorro'
import { agruparPorCategoria } from '../utils/agruparPorCategoria'
import { formatCurrency } from '../utils/formatCurrency'
import {
  formatMonthLabel,
  getDaysRemainingInMonth,
  getDaysRemainingInQuincena,
  getMonthRange,
  getQuincenaPeriodo,
  isCurrentMonth,
  shiftMonth,
} from '../utils/date'
import { buildEvolucionMensual } from '../utils/evolucionMensual'
import { mergeResumenWithOptimistic } from '../utils/optimisticGastos'
import { getMetaProgress } from '../utils/metaProgress'
import { calcularCompromisosMsi } from '../utils/msiCompromisos'
import { calcularSaludAhorro, type SaludNivel } from '../utils/saludAhorro'
import { shouldShowBurnRateAlert } from '../utils/burnRate'
import { calcSafeToSpend, sumRecibosPendientes } from '../utils/safeToSpend'
import { calcMeAlcanza } from '../utils/meAlcanza'
import { getQuincenaRange, isDateInQuincena, sumRecibosPendientesQuincena } from '../utils/quincena'
import { isVistaQuincenal, setVistaQuincenal } from '../utils/vistaQuincenal'
import { proyectarDiaAgotamiento } from '../utils/limitProjection'
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
import { isModoViaje, setModoViaje } from '../utils/travelMode'
import { showError, showSuccess, showWarning } from '../utils/toast'
import { validateMonto } from '../utils/validation'
import MonthSelector from './MonthSelector'
import { cardClassName, inputClassName } from './formStyles'

const GastoChart = lazy(() => import('./GastoChart'))
const GastoBarChart = lazy(() => import('./GastoBarChart'))

type ChartView = 'categoria' | 'evolucion'

const SALUD_STYLES: Record<SaludNivel, { border: string; bg: string; text: string }> = {
  excelente: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
  },
  alto: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
  },
  medio: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
  },
  bajo: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
  },
}

interface ResumenMensual {
  categoria: string
  total: number
  cantidad: number
}

export default function Dashboard() {
  const { user } = useAuthContext()
  const { refreshKey, isSyncing, pendingCount, optimisticGastos, refresh } = useGastosRefresh()
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [resumenMensual, setResumenMensual] = useState<ResumenMensual[]>([])
  const [limiteMensual, setLimiteMensual] = useState(10000)
  const [limiteInput, setLimiteInput] = useState('10000')
  const [guardandoLimite, setGuardandoLimite] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metas, setMetas] = useState<MetaAhorro[]>([])
  const [metasCargando, setMetasCargando] = useState(true)
  const [metasError, setMetasError] = useState<string | null>(null)
  const [metasFromCache, setMetasFromCache] = useState(false)
  const [mostrarFormMeta, setMostrarFormMeta] = useState(false)
  const [metaNombre, setMetaNombre] = useState('')
  const [metaObjetivo, setMetaObjetivo] = useState('')
  const [guardandoMeta, setGuardandoMeta] = useState(false)
  const [ahorroInputs, setAhorroInputs] = useState<Record<number, string>>({})
  const [sumandoMetaId, setSumandoMetaId] = useState<number | null>(null)
  const [gastosMsi, setGastosMsi] = useState<{ monto: number; fecha: string }[]>([])
  const [evolucionRows, setEvolucionRows] = useState<{ mes: string; total: number }[]>([])
  const [chartView, setChartView] = useState<ChartView>('categoria')
  const [mostrarGraficas, setMostrarGraficas] = useState(false)
  const [recurrentes, setRecurrentes] = useState<GastoRecurrente[]>([])
  const [modoViaje, setModoViajeState] = useState(() => isModoViaje())
  const [gastoTotalResumen, setGastoTotalResumen] = useState<number | null>(null)
  const [gastoTotalAntesResumen, setGastoTotalAntesResumen] = useState<number | null>(null)
  const [recurrenteSugerido, setRecurrenteSugerido] = useState<RecurrenteSugerido | null>(null)
  const [marcandoRecurrente, setMarcandoRecurrente] = useState(false)
  const [vistaQuincenal, setVistaQuincenalState] = useState(() => isVistaQuincenal())
  const [gastoQuincenaBase, setGastoQuincenaBase] = useState(0)
  const [mostrarMeAlcanza, setMostrarMeAlcanza] = useState(false)
  const [montoMeAlcanza, setMontoMeAlcanza] = useState('')

  const mesLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth])
  const esMesActual = useMemo(() => isCurrentMonth(selectedMonth), [selectedMonth])

  const resumen = useMemo(
    () =>
      agruparPorCategoria(
        mergeResumenWithOptimistic(resumenMensual, optimisticGastos, selectedMonth),
      ),
    [resumenMensual, optimisticGastos, selectedMonth],
  )

  const gastoTotal = useMemo(
    () => resumen.reduce((sum, item) => sum + item.total, 0),
    [resumen],
  )

  const diasRestantes = useMemo(
    () => (esMesActual ? getDaysRemainingInMonth(selectedMonth) : 0),
    [esMesActual, selectedMonth],
  )

  const diasRestantesQuincena = useMemo(
    () => (esMesActual ? getDaysRemainingInQuincena() : 0),
    [esMesActual],
  )

  const quincenaPeriodo = useMemo(
    () => (esMesActual ? getQuincenaPeriodo() : null),
    [esMesActual],
  )

  const gastoQuincena = useMemo(() => {
    const optimistic = optimisticGastos
      .filter((gasto) => isDateInQuincena(gasto.fecha))
      .reduce((sum, gasto) => sum + gasto.monto, 0)
    return gastoQuincenaBase + optimistic
  }, [gastoQuincenaBase, optimisticGastos])

  const diaActual = useMemo(() => new Date().getDate(), [])

  const recibosPendientes = useMemo(
    () => (esMesActual ? sumRecibosPendientes(recurrentes, diaActual) : 0),
    [esMesActual, recurrentes, diaActual],
  )

  const recibosPendientesQuincena = useMemo(
    () => (esMesActual ? sumRecibosPendientesQuincena(recurrentes, diaActual) : 0),
    [esMesActual, recurrentes, diaActual],
  )

  const usarVistaQuincenal = vistaQuincenal && esMesActual

  const safeToSpend = useMemo(
    () =>
      calcSafeToSpend({
        limiteMensual: usarVistaQuincenal ? limiteMensual / 2 : limiteMensual,
        gastoTotal: usarVistaQuincenal ? gastoQuincena : gastoTotal,
        recibosPendientes: usarVistaQuincenal ? recibosPendientesQuincena : recibosPendientes,
        diasRestantes: usarVistaQuincenal ? diasRestantesQuincena : diasRestantes,
      }),
    [
      limiteMensual,
      gastoTotal,
      gastoQuincena,
      recibosPendientes,
      recibosPendientesQuincena,
      diasRestantes,
      diasRestantesQuincena,
      usarVistaQuincenal,
    ],
  )

  const disponible = safeToSpend.disponible
  const presupuestoDiario = esMesActual ? safeToSpend.presupuestoDiario : 0
  const diasRestantesEfectivos = usarVistaQuincenal ? diasRestantesQuincena : diasRestantes
  const recibosEfectivos = usarVistaQuincenal ? recibosPendientesQuincena : recibosPendientes

  const meAlcanzaResult = useMemo(() => {
    const monto = Number(montoMeAlcanza)
    return calcMeAlcanza({
      disponible,
      diasRestantes: diasRestantesEfectivos,
      montoEstimado: monto,
      presupuestoDiarioActual: presupuestoDiario,
    })
  }, [disponible, diasRestantesEfectivos, montoMeAlcanza, presupuestoDiario])

  const burnRateAlerta = useMemo(
    () =>
      !modoViaje &&
      esMesActual &&
      shouldShowBurnRateAlert(gastoTotal, limiteMensual, diaActual),
    [modoViaje, esMesActual, gastoTotal, limiteMensual, diaActual],
  )

  const diaAgotamiento = useMemo(
    () =>
      !modoViaje && esMesActual
        ? proyectarDiaAgotamiento(gastoTotal, limiteMensual, diaActual)
        : null,
    [modoViaje, esMesActual, gastoTotal, limiteMensual, diaActual],
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
    () => calcularCompromisosMsi(gastosMsi, optimisticGastos, limiteMensual),
    [gastosMsi, optimisticGastos, limiteMensual],
  )

  const evolucionMensual = useMemo(
    () => buildEvolucionMensual(evolucionRows, optimisticGastos),
    [evolucionRows, optimisticGastos],
  )

  const tieneDatosAnalisis =
    resumen.length > 0 || evolucionMensual.some((item) => item.total > 0)

  useEffect(() => {
    if (!user) return

    async function cargarDashboard() {
      setCargando(true)
      setError(null)

      const { inicio, fin } = getMonthRange(selectedMonth)
      const limite = await getLimiteMensual(user.id)
      setLimiteMensual(limite)
      setLimiteInput(String(limite))

      const { data: recurrentesData } = await listGastosRecurrentes(user.id)
      setRecurrentes(recurrentesData)

      const { data, error: queryError } = await supabase
        .from('gastos_resumen_mensual')
        .select('categoria, total, cantidad')
        .eq('user_id', user.id)
        .gte('mes', inicio.toISOString())
        .lt('mes', fin.toISOString())

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

        setGastoQuincenaBase(
          (quincenaData ?? []).reduce((sum, row) => sum + Number(row.monto), 0),
        )
      } else {
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

      setGastosMsi(
        (msiData ?? []).map((item) => ({
          monto: Number(item.monto),
          fecha: item.fecha,
        })),
      )

      const inicioEvolucion = shiftMonth(inicioMsi, -3)
      const finEvolucion = shiftMonth(inicioMsi, 1)

      const { data: evoData } = await supabase
        .from('gastos_resumen_mensual')
        .select('mes, total')
        .eq('user_id', user.id)
        .gte('mes', inicioEvolucion.toISOString())
        .lt('mes', finEvolucion.toISOString())

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
  }, [user, refreshKey, selectedMonth])

  const cargarMetas = useCallback(async () => {
    if (!user) return

    setMetasCargando(true)
    setMetasError(null)

    const { data, error: listError, fromCache } = await listMetasAhorro(user.id)
    setMetasCargando(false)
    setMetasFromCache(fromCache)

    if (listError) {
      setMetasError(listError)
      return
    }

    setMetas(data)
  }, [user])

  useEffect(() => {
    cargarMetas()
  }, [cargarMetas, refreshKey])

  async function handleCrearMeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    const objetivoError = validateMonto(metaObjetivo)
    if (objetivoError) {
      showError(objetivoError)
      return
    }

    const nombre = metaNombre.trim()
    if (!nombre) {
      showError('El nombre de la meta es obligatorio.')
      return
    }

    setGuardandoMeta(true)
    const { data, error: createError } = await createMetaAhorro(user.id, {
      nombre,
      monto_objetivo: Number(metaObjetivo),
    })
    setGuardandoMeta(false)

    if (createError) {
      showError(createError)
      return
    }

    if (data) {
      setMetas((current) => [...current, data])
    }

    setMetaNombre('')
    setMetaObjetivo('')
    setMostrarFormMeta(false)
    showSuccess('Meta de ahorro creada.')
  }

  async function handleSumarAhorro(meta: MetaAhorro) {
    if (!user) return

    const inputValue = ahorroInputs[meta.id] ?? ''
    const montoError = validateMonto(inputValue)
    if (montoError) {
      showError(montoError)
      return
    }

    const amount = Number(inputValue)
    setSumandoMetaId(meta.id)

    const previousMetas = metas
    setMetas((current) =>
      current.map((item) =>
        item.id === meta.id
          ? { ...item, monto_actual: item.monto_actual + amount }
          : item,
      ),
    )

    const { data, error: addError, offline } = await addAhorroToMeta(
      user.id,
      meta.id,
      amount,
      meta.monto_actual,
    )

    setSumandoMetaId(null)

    if (addError) {
      setMetas(previousMetas)
      showError(addError)
      return
    }

    if (data) {
      setMetas((current) =>
        current.map((item) => (item.id === meta.id ? data : item)),
      )
    }

    setAhorroInputs((current) => ({ ...current, [meta.id]: '' }))

    if (offline) {
      showWarning('Sin conexión. El ahorro se guardó localmente y se sincronizará al volver internet.')
      return
    }

    showSuccess(`Se sumaron ${formatCurrency(amount)} a "${meta.nombre}".`)
  }

  async function handleGuardarLimite(event: FormEvent<HTMLFormElement>) {
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
  }

  function handleToggleModoViaje() {
    const activo = !modoViaje
    setModoViajeState(activo)
    setModoViaje(activo)
  }

  function handleToggleVistaQuincenal() {
    const activo = !vistaQuincenal
    setVistaQuincenalState(activo)
    setVistaQuincenal(activo)
  }

  async function handleMarcarRecurrente() {
    if (!recurrenteSugerido || !user) return

    setMarcandoRecurrente(true)
    const { error } = await createGastoRecurrente({
      descripcion: recurrenteSugerido.descripcion,
      monto: recurrenteSugerido.monto,
      categoria: recurrenteSugerido.categoria,
      dia_mes: recurrenteSugerido.dia_mes,
    })
    setMarcandoRecurrente(false)

    if (error) {
      showError(`No se pudo crear el recurrente: ${error}`)
      return
    }

    dismissRecurrenteSugerido(recurrenteSugerido.descripcion)
    setRecurrenteSugerido(null)
    showSuccess('Gasto recurrente configurado.')
    refresh()
  }

  function handleDescartarRecurrente() {
    if (!recurrenteSugerido) return
    dismissRecurrenteSugerido(recurrenteSugerido.descripcion)
    setRecurrenteSugerido(null)
  }

  return (
    <section className={cardClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Gasto del mes
            </p>
            <p className="text-sm capitalize text-slate-500">{mesLabel}</p>
            {cargando ? (
              <p className="pt-2 text-4xl font-bold text-slate-500">...</p>
            ) : (
              <p className="pt-2 text-4xl font-bold text-white">
                {formatCurrency(gastoTotal)}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleModoViaje}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            modoViaje
              ? 'border-sky-500/50 bg-sky-500/15 text-sky-300'
              : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white'
          }`}
          aria-pressed={modoViaje}
        >
          {modoViaje ? '✈ Modo viaje' : 'Modo viaje'}
        </button>
      </div>

      {recurrenteSugerido && (
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3">
          <p className="text-sm text-sky-100">
            Llevas 3 meses pagando {recurrenteSugerido.descripcion} ~{' '}
            {formatCurrency(recurrenteSugerido.monto)}. ¿Lo marco como recurrente?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleMarcarRecurrente}
              disabled={marcandoRecurrente}
              className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-400 disabled:opacity-60"
            >
              {marcandoRecurrente ? 'Guardando...' : 'Sí, marcar'}
            </button>
            <button
              type="button"
              onClick={handleDescartarRecurrente}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

      {resumenFinMes && !cargando && (
        <div className="rounded-xl border border-slate-600/40 bg-slate-900/50 px-4 py-3">
          <p className="text-sm text-slate-200">
            En <span className="capitalize">{resumenFinMes.mesLabel}</span> gastaste{' '}
            {formatCurrency(resumenFinMes.gastoTotal)}
            {resumenFinMes.variacionPct != null && (
              <span className="text-slate-400">
                {' '}
                ({resumenFinMes.variacionPct > 0 ? '+' : ''}
                {resumenFinMes.variacionPct}% vs el mes anterior)
              </span>
            )}
            .
          </p>
          {resumenFinMes.metasTotal > 0 && (
            <p className="mt-1 text-xs text-emerald-400">
              Cumpliste {resumenFinMes.metasCumplidas} de {resumenFinMes.metasTotal} metas.
            </p>
          )}
        </div>
      )}

      {esMesActual && !cargando && (
        <div
          className={`rounded-xl border px-4 py-3 text-center ${
            disponible >= 0
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Presupuesto diario
            </p>
            <div className="inline-flex rounded-full border border-slate-600/80 bg-slate-900/60 p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => vistaQuincenal && handleToggleVistaQuincenal()}
                className={`rounded-full px-2 py-0.5 font-medium transition ${
                  !vistaQuincenal
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => !vistaQuincenal && handleToggleVistaQuincenal()}
                className={`rounded-full px-2 py-0.5 font-medium transition ${
                  vistaQuincenal
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Quincenal
              </button>
            </div>
          </div>
          <p
            className={`mt-1 text-2xl font-bold ${
              disponible >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {disponible >= 0
              ? `Puedes gastar ${formatCurrency(presupuestoDiario)} hoy`
              : `Apretado: ${formatCurrency(Math.abs(disponible))} sobre tu límite`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {vistaQuincenal ? (
              <>
                Quincena {quincenaPeriodo} · Límite {formatCurrency(limiteMensual / 2)} ·{' '}
                {diasRestantesEfectivos} días restantes
              </>
            ) : (
              <>
                Límite {formatCurrency(limiteMensual)} · {diasRestantesEfectivos} días restantes
              </>
            )}
          </p>
          {recibosEfectivos > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Excluyendo {formatCurrency(recibosEfectivos)} en recibos próximos
            </p>
          )}
          {diaAgotamiento != null && !vistaQuincenal && (
            <p className="mt-1 text-xs text-slate-400">
              Al ritmo actual, tu límite se acaba ~el día {diaAgotamiento}
            </p>
          )}
        </div>
      )}

      {esMesActual && !cargando && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/40">
          <button
            type="button"
            onClick={() => setMostrarMeAlcanza((current) => !current)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:text-white"
            aria-expanded={mostrarMeAlcanza}
          >
            <span>¿Me alcanza para...?</span>
            <span className="text-xs text-slate-500">{mostrarMeAlcanza ? '▲' : '▼'}</span>
          </button>
          {mostrarMeAlcanza && (
            <div className="space-y-2 border-t border-slate-700/60 px-4 py-3">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="Monto estimado"
                value={montoMeAlcanza}
                onChange={(e) => setMontoMeAlcanza(e.target.value)}
                className={inputClassName}
              />
              {meAlcanzaResult && (
                <p
                  className={`text-sm ${
                    meAlcanzaResult.tono === 'bien'
                      ? 'text-emerald-400'
                      : meAlcanzaResult.tono === 'apretado'
                        ? 'text-amber-400'
                        : 'text-amber-300'
                  }`}
                >
                  {meAlcanzaResult.mensaje}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {burnRateAlerta && (
        <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3">
          <p className="text-sm text-orange-200">
            Estás gastando rápido este mes. ¡Intenta pisar el freno!
          </p>
        </div>
      )}

      {esMesActual && !cargando && (
        <div
          className={`rounded-xl border px-4 py-3 ${SALUD_STYLES[saludAhorro.nivel].border} ${SALUD_STYLES[saludAhorro.nivel].bg}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Salud de ahorro
            </p>
            <span
              className={`text-sm font-bold ${SALUD_STYLES[saludAhorro.nivel].text}`}
            >
              {saludAhorro.porcentaje}%
            </span>
          </div>
          <p className={`mt-1 text-sm ${SALUD_STYLES[saludAhorro.nivel].text}`}>
            {saludAhorro.mensaje}
          </p>
        </div>
      )}

      {!cargando && (
        <div className="space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-slate-200">Compromisos MSI</h3>
            <p className="text-xs text-slate-500">
              Cuánto de tu presupuesto ya está comprometido por mensualidades
            </p>
          </div>
          <div className="space-y-2">
            {compromisosMsi.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="capitalize text-slate-300">{item.label}</span>
                <div className="text-right">
                  <p className="font-medium text-violet-300">
                    {formatCurrency(item.comprometido)} comprometidos
                  </p>
                  <p
                    className={`text-xs ${
                      item.disponibleReal >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {item.disponibleReal >= 0
                      ? `${formatCurrency(item.disponibleReal)} libres de ${formatCurrency(item.limite)}`
                      : `Excedido en ${formatCurrency(Math.abs(item.disponibleReal))}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {esMesActual && (
        <form onSubmit={handleGuardarLimite} className="flex gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="limite" className="sr-only">
              Límite mensual
            </label>
            <input
              id="limite"
              type="number"
              min="1"
              step="100"
              value={limiteInput}
              onChange={(e) => setLimiteInput(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              placeholder="Límite mensual"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoLimite}
            className="shrink-0 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-60"
          >
            {guardandoLimite ? '...' : 'Guardar'}
          </button>
        </form>
      )}

      {(isSyncing || pendingCount > 0) && (
        <p className="text-center text-xs text-amber-300">
          {isSyncing
            ? 'Sincronizando gastos offline...'
            : `${pendingCount} gasto(s) pendiente(s) de sincronizar`}
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error al cargar gastos: {error}
        </p>
      )}

      {!cargando && !error && resumen.length === 0 && (
        <p className="text-center text-sm text-slate-400">
          No hay gastos registrados en este mes.
        </p>
      )}

      {!cargando && tieneDatosAnalisis && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMostrarGraficas((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            <span>{mostrarGraficas ? 'Ocultar análisis' : 'Ver análisis de gastos'}</span>
            <span className="text-slate-500">{mostrarGraficas ? '▲' : '▼'}</span>
          </button>

          {mostrarGraficas && (
            <div className="space-y-4">
              <div
                className="flex rounded-lg border border-slate-700/60 bg-slate-900/40 p-0.5"
                role="tablist"
                aria-label="Tipo de gráfica"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartView === 'categoria'}
                  onClick={() => setChartView('categoria')}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
                    chartView === 'categoria'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Por categoría
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartView === 'evolucion'}
                  onClick={() => setChartView('evolucion')}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
                    chartView === 'evolucion'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Evolución mensual
                </button>
              </div>

              <Suspense
                fallback={
                  <p className="text-center text-sm text-slate-400">Cargando gráfica...</p>
                }
              >
                {chartView === 'categoria' ? (
                  <GastoChart data={resumen} />
                ) : (
                  <GastoBarChart data={evolucionMensual} />
                )}
              </Suspense>

              {chartView === 'categoria' && (
                <>
                  <h3 className="text-sm font-semibold text-slate-300">Por categoría</h3>
                  {resumen.map((item) => (
                    <div key={item.categoria} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-200">{item.categoria}</span>
                        <span className="text-slate-400">
                          {formatCurrency(item.total)}{' '}
                          <span className="text-slate-500">
                            ({item.porcentaje.toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-700/80">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${COLORES_CATEGORIA[item.categoria] ?? 'bg-blue-500'}`}
                          style={{ width: `${item.porcentaje}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {chartView === 'evolucion' && (
                <p className="text-center text-xs text-slate-500">
                  Total gastado en los últimos 4 meses
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4 border-t border-slate-700/60 pt-5">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-300">Metas de ahorro</h3>
          <p className="text-xs text-slate-500">
            Define un objetivo y suma ahorros de forma rápida
          </p>
        </div>

        {metasFromCache && metas.length > 0 && (
          <p className="text-xs text-amber-300">Mostrando metas guardadas localmente.</p>
        )}

        {metasError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Error al cargar metas: {metasError}
          </p>
        )}

        {metasCargando && (
          <p className="text-center text-sm text-slate-400">Cargando metas...</p>
        )}

        {!metasCargando && metas.length === 0 && !metasError && (
          <div className="space-y-3">
            <p className="text-center text-sm text-slate-400">
              Aún no tienes metas de ahorro.
            </p>
            {!mostrarFormMeta ? (
              <button
                type="button"
                onClick={() => setMostrarFormMeta(true)}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                Crear meta
              </button>
            ) : (
              <form onSubmit={handleCrearMeta} className="space-y-3">
                <input
                  type="text"
                  value={metaNombre}
                  onChange={(e) => setMetaNombre(e.target.value)}
                  placeholder="Nombre (ej. Vacaciones)"
                  className={inputClassName}
                  maxLength={100}
                  required
                />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={metaObjetivo}
                  onChange={(e) => setMetaObjetivo(e.target.value)}
                  placeholder="Monto objetivo"
                  className={inputClassName}
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarFormMeta(false)}
                    className="flex-1 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoMeta}
                    className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {guardandoMeta ? 'Guardando...' : 'Crear'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {!metasCargando && metas.length > 0 && (
          <div className="space-y-4">
            {metas.map((meta) => {
              const progress = getMetaProgress(meta)
              const isSumando = sumandoMetaId === meta.id

              return (
                <div
                  key={meta.id}
                  className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{meta.nombre}</p>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(meta.monto_actual)} de{' '}
                        {formatCurrency(meta.monto_objetivo)} ({progress.toFixed(0)}%)
                      </p>
                    </div>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-700/80">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={ahorroInputs[meta.id] ?? ''}
                      onChange={(e) =>
                        setAhorroInputs((current) => ({
                          ...current,
                          [meta.id]: e.target.value,
                        }))
                      }
                      placeholder="Sumar..."
                      className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                      aria-label={`Sumar ahorro a ${meta.nombre}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleSumarAhorro(meta)}
                      disabled={isSumando}
                      className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {isSumando ? '...' : 'Sumar'}
                    </button>
                  </div>
                </div>
              )
            })}

            {!mostrarFormMeta ? (
              <button
                type="button"
                onClick={() => setMostrarFormMeta(true)}
                className="w-full rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                + Añadir otra meta
              </button>
            ) : (
              <form onSubmit={handleCrearMeta} className="space-y-3 border-t border-slate-700/60 pt-4">
                <input
                  type="text"
                  value={metaNombre}
                  onChange={(e) => setMetaNombre(e.target.value)}
                  placeholder="Nombre de la nueva meta"
                  className={inputClassName}
                  maxLength={100}
                  required
                />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={metaObjetivo}
                  onChange={(e) => setMetaObjetivo(e.target.value)}
                  placeholder="Monto objetivo"
                  className={inputClassName}
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarFormMeta(false)}
                    className="flex-1 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoMeta}
                    className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {guardandoMeta ? 'Guardando...' : 'Crear meta'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
