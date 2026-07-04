import { memo, useMemo, useState } from 'react'
import { useOfflineSync, useQuietMode, useFocusMode } from '../contexts'
import { useDashboardData } from '../hooks/useDashboardData'
import { useMetasAhorro } from '../hooks/useMetasAhorro'
import ListaCuentas from './ListaCuentas'
import ProyeccionCierre from './ProyeccionCierre'
import DashboardFocusView from './dashboard/DashboardFocusView'
import DashboardHeader from './dashboard/DashboardHeader'
import DashboardHeroCard from './dashboard/DashboardHeroCard'
import BurnRateAlert from './dashboard/BurnRateAlert'
import OfflineSyncStatus from './dashboard/OfflineSyncStatus'
import DashboardStatus from './dashboard/DashboardStatus'
import GastosAnalisisSection from './dashboard/GastosAnalisisSection'
import PatrimonioCards from './dashboard/PatrimonioCards'
import SaludAhorroWidget from './dashboard/SaludAhorroWidget'
import ResumenFinMesBanner from './dashboard/ResumenFinMesBanner'
import RecurrenteSugeridoBanner from './dashboard/RecurrenteSugeridoBanner'
import CompromisosMsiWidget from './dashboard/CompromisosMsiWidget'
import SalidasTimelineSection from './SalidasTimelineSection'
import { dashboardShellClassName } from './formStyles'

export default memo(function Dashboard() {
  const { isSyncing, pendingCount } = useOfflineSync()
  const { modoTranquilo, toggleModoTranquilo } = useQuietMode()
  const { isFocusMode, toggleFocusMode } = useFocusMode()
  const { metas } = useMetasAhorro(!isFocusMode)
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
    handleToggleModoViaje,
    handleMarcarRecurrente,
    handleDescartarRecurrente,
  } = useDashboardData(selectedMonth, metas, { lite: isFocusMode })

  const tieneCompromisosMsi = useMemo(
    () => compromisosMsi.some((item) => item.comprometido > 0),
    [compromisosMsi],
  )

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

              <ListaCuentas embedded />

              {tieneCompromisosMsi && (
                <CompromisosMsiWidget compromisos={compromisosMsi} />
              )}

              {burnRateAlerta && <BurnRateAlert />}

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

      <SalidasTimelineSection />
    </div>
  )
})
