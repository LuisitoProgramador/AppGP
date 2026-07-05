import { memo, useMemo, useState } from 'react'
import { useAuthSession, useCuentas, useOfflineSyncStatus, useQuietMode, useFocusMode } from '../contexts'
import { useDashboardData } from '../hooks/dashboard/useDashboardData'
import { useMetasAhorro } from '../hooks/useMetasAhorro'
import { calcAlertasCategoria, getLimitesPorCategoria } from '../services/presupuestoCategorias'
import {
  calcAhorroMensual503020,
  calcResumenBuckets503020,
} from '../utils/finanzas/regla503020'
import { calcInteresEstimado, getTasaInteresMensual } from '../services/cuentaInteres'
import { buildResumenInsights } from '../utils/dashboard/resumenInsights'
import {
  dismissWelcomeBack,
  getWelcomeBackState,
  navigateToTab,
} from '../utils/dashboard/welcomeBack'
import ListaCuentas from './cuentas/ListaCuentas'
import ProyeccionCierre from './ProyeccionCierre'
import DashboardFocusView from './dashboard/layout/DashboardFocusView'
import DashboardHeader from './dashboard/layout/DashboardHeader'
import DashboardHeroCard from './dashboard/layout/DashboardHeroCard'
import BurnRateAlert from './dashboard/alerts/BurnRateAlert'
import WelcomeBackBanner from './dashboard/alerts/WelcomeBackBanner'
import ResumenInsightsCard from './dashboard/alerts/ResumenInsightsCard'
import CategoryBudgetAlerts from './dashboard/alerts/CategoryBudgetAlerts'
import Regla503020Widget from './dashboard/widgets/Regla503020Widget'
import OfflineSyncStatus from './dashboard/widgets/OfflineSyncStatus'
import DashboardStatus from './dashboard/layout/DashboardStatus'
import GastosAnalisisSection from './dashboard/widgets/GastosAnalisisSection'
import PatrimonioCards from './dashboard/widgets/PatrimonioCards'
import SaludAhorroWidget from './dashboard/widgets/SaludAhorroWidget'
import ResumenFinMesBanner from './dashboard/alerts/ResumenFinMesBanner'
import RecurrenteSugeridoBanner from './dashboard/alerts/RecurrenteSugeridoBanner'
import CompromisosMsiWidget from './dashboard/widgets/CompromisosMsiWidget'
import SalidasTimelineSection from './SalidasTimelineSection'
import { dashboardShellClassName } from './ui/formStyles'

export default memo(function Dashboard() {
  const { user } = useAuthSession()
  const { cuentas } = useCuentas()
  const { isSyncing, pendingCount } = useOfflineSyncStatus()
  const { modoTranquilo, toggleModoTranquilo } = useQuietMode()
  const { isFocusMode, toggleFocusMode } = useFocusMode()
  const { metas } = useMetasAhorro(!isFocusMode)
  const [welcomeBack, setWelcomeBack] = useState(() => getWelcomeBackState())
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )

  const {
    cargando,
    error,
    esMesActual,
    gastoTotal,
    resumen,
    limiteMensual,
    ingresoMensualTotal,
    patrimonioLiquido,
    disponible,
    presupuestoDiario,
    diasRestantesEfectivos,
    recibosEfectivos,
    msiPendientes,
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
    recurrentes,
    gastosMsi,
    handleToggleModoViaje,
    handleMarcarRecurrente,
    handleDescartarRecurrente,
  } = useDashboardData(selectedMonth, metas, { lite: isFocusMode })

  const tieneCompromisosMsi = useMemo(
    () => compromisosMsi.some((item) => item.comprometido > 0),
    [compromisosMsi],
  )

  const gastosPorCategoria = useMemo(
    () => Object.fromEntries(resumen.map((item) => [item.categoria, item.total])),
    [resumen],
  )

  const interesTarjetasEstimado = useMemo(() => {
    let total = 0
    for (const cuenta of cuentas) {
      if (cuenta.tipo !== 'credito' || cuenta.saldo_actual <= 0) continue
      const tasa = getTasaInteresMensual(cuenta)
      const interes = calcInteresEstimado(cuenta.saldo_actual, tasa)
      if (interes != null) total += interes
    }
    return total > 0 ? total : null
  }, [cuentas])

  const alertasCategoria = useMemo(() => {
    if (!user || !esMesActual) return []
    return calcAlertasCategoria(getLimitesPorCategoria(user.id), gastosPorCategoria)
  }, [user, esMesActual, gastosPorCategoria])

  const regla503020 = useMemo(() => {
    if (!esMesActual || ingresoMensualTotal == null || ingresoMensualTotal <= 0) return null
    return {
      buckets: calcResumenBuckets503020(ingresoMensualTotal, gastosPorCategoria),
      ahorroMensual: calcAhorroMensual503020(ingresoMensualTotal),
    }
  }, [esMesActual, ingresoMensualTotal, gastosPorCategoria])

  const insights = useMemo(() => {
    if (!esMesActual || cargando) return null
    return buildResumenInsights({
      gastoTotal,
      limiteMensual,
      gastosPorCategoria,
      disponible,
    })
  }, [esMesActual, cargando, gastoTotal, limiteMensual, gastosPorCategoria, disponible])

  return (
    <div className="flex flex-col gap-4">
      <section className={dashboardShellClassName}>
        <div className="flex flex-col gap-4">
          <DashboardHeader
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            isFocusMode={isFocusMode}
            onToggleFocusMode={toggleFocusMode}
            modoViaje={modoViaje}
            modoTranquilo={modoTranquilo}
            onToggleModoViaje={handleToggleModoViaje}
            onToggleModoTranquilo={toggleModoTranquilo}
          />

          {isFocusMode ? (
            <DashboardFocusView
              esMesActual={esMesActual}
              cargando={cargando}
              focusView={focusView}
            />
          ) : (
            <>
              {welcomeBack.show && esMesActual && (
                <WelcomeBackBanner
                  diasAusente={welcomeBack.diasAusente}
                  disponible={disponible}
                  onRegistrar={() => {
                    dismissWelcomeBack()
                    setWelcomeBack(getWelcomeBackState())
                    navigateToTab('registro')
                  }}
                  onDismiss={() => {
                    dismissWelcomeBack()
                    setWelcomeBack(getWelcomeBackState())
                  }}
                />
              )}

              {resumenFinMes && <ResumenFinMesBanner resumen={resumenFinMes} />}

              {recurrenteSugerido && (
                <RecurrenteSugeridoBanner
                  sugerido={recurrenteSugerido}
                  marcando={marcandoRecurrente}
                  onMarcar={handleMarcarRecurrente}
                  onDescartar={handleDescartarRecurrente}
                />
              )}

              {(ingresoMensualTotal != null || patrimonioLiquido != null) && (
                <PatrimonioCards
                  ingresoMensualTotal={ingresoMensualTotal}
                  patrimonioLiquido={patrimonioLiquido}
                  limiteMensual={limiteMensual}
                />
              )}

              <DashboardHeroCard
                gastoTotal={gastoTotal}
                cargando={cargando}
                esMesActual={esMesActual}
                disponible={disponible}
                presupuestoDiario={presupuestoDiario}
                limiteMensual={limiteMensual}
                diasRestantesEfectivos={diasRestantesEfectivos}
                recibosEfectivos={recibosEfectivos}
                msiPendientes={msiPendientes}
                modoTranquilo={modoTranquilo}
                diaAgotamiento={diaAgotamiento}
              />

              {esMesActual && !cargando && <SaludAhorroWidget saludAhorro={saludAhorro} />}

              {regla503020 && ingresoMensualTotal != null && (
                <Regla503020Widget
                  ingresoMensual={ingresoMensualTotal}
                  ahorroMensual={regla503020.ahorroMensual}
                  buckets={regla503020.buckets}
                />
              )}

              <ListaCuentas embedded />

              {tieneCompromisosMsi && (
                <CompromisosMsiWidget
                  compromisos={compromisosMsi}
                  interesTarjetasEstimado={interesTarjetasEstimado}
                />
              )}

              {burnRateAlerta && <BurnRateAlert />}

              {alertasCategoria.length > 0 && (
                <CategoryBudgetAlerts alertas={alertasCategoria} />
              )}

              {insights && esMesActual && !cargando && (
                <ResumenInsightsCard
                  linea={insights.linea}
                  recomendacion={insights.recomendacion}
                />
              )}

              {proyeccionCierre && !cargando && (
                <ProyeccionCierre proyeccion={proyeccionCierre} ocultarAdvertencias={modoTranquilo} />
              )}

              {tieneDatosAnalisis && (
                <GastosAnalisisSection resumen={resumen} evolucionMensual={evolucionMensual} />
              )}

              <OfflineSyncStatus isSyncing={isSyncing} pendingCount={pendingCount} />

              <DashboardStatus
                error={error}
                cargando={cargando}
                sinGastos={resumen.length === 0}
              />
            </>
          )}
        </div>
      </section>

      <SalidasTimelineSection
        selectedMonth={selectedMonth}
        recurrentes={recurrentes}
        gastosMsi={gastosMsi}
      />
    </div>
  )
})
