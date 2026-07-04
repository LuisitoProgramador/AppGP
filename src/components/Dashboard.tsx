import { memo, useState } from 'react'
import { useOfflineSync, useQuietMode, useFocusMode } from '../contexts'
import { useDashboardData } from '../hooks/useDashboardData'
import { useMetasAhorro } from '../hooks/useMetasAhorro'
import PresupuestoSettings from './PresupuestoSettings'
import ProyeccionCierre from './ProyeccionCierre'
import MetasAhorroSection from './dashboard/MetasAhorroSection'
import DashboardFocusView from './dashboard/DashboardFocusView'
import DashboardHeader from './dashboard/DashboardHeader'
import SaludAhorroWidget from './dashboard/SaludAhorroWidget'
import CompromisosMsiWidget from './dashboard/CompromisosMsiWidget'
import FocusModeToggle from './dashboard/FocusModeToggle'
import RecurrenteSugeridoBanner from './dashboard/RecurrenteSugeridoBanner'
import ResumenFinMesBanner from './dashboard/ResumenFinMesBanner'
import PatrimonioCards from './dashboard/PatrimonioCards'
import PresupuestoWidget from './dashboard/PresupuestoWidget'
import MeAlcanzaWidget from './dashboard/MeAlcanzaWidget'
import BurnRateAlert from './dashboard/BurnRateAlert'
import OfflineSyncStatus from './dashboard/OfflineSyncStatus'
import DashboardStatus from './dashboard/DashboardStatus'
import GastosAnalisisSection from './dashboard/GastosAnalisisSection'
import CollapsibleSection from './dashboard/CollapsibleSection'
import { cardClassName, formWithKeyboardClassName } from './formStyles'

export default memo(function Dashboard() {
  const { isSyncing, pendingCount } = useOfflineSync()
  const { modoTranquilo, toggleModoTranquilo } = useQuietMode()
  const { isFocusMode, toggleFocusMode } = useFocusMode()
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )

  const metasAhorro = useMetasAhorro(!isFocusMode)

  const {
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
  } = useDashboardData(selectedMonth, metasAhorro.metas, { lite: isFocusMode })

  return (
    <section className={`${cardClassName} ${formWithKeyboardClassName} transition-all duration-300`}>
      <FocusModeToggle isFocusMode={isFocusMode} onToggle={toggleFocusMode} />

      {isFocusMode ? (
        <DashboardFocusView
          esMesActual={esMesActual}
          cargando={cargando}
          focusView={focusView}
        />
      ) : (
        <>
          <DashboardHeader
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            mesLabel={mesLabel}
            gastoTotal={gastoTotal}
            cargando={cargando}
            modoViaje={modoViaje}
            modoTranquilo={modoTranquilo}
            onToggleModoViaje={handleToggleModoViaje}
            onToggleModoTranquilo={toggleModoTranquilo}
            compact
          />

          {esMesActual && !cargando && (
            <PresupuestoWidget
              disponible={disponible}
              presupuestoDiario={presupuestoDiario}
              limiteMensual={limiteMensual}
              diasRestantesEfectivos={diasRestantesEfectivos}
              recibosEfectivos={recibosEfectivos}
              msiPendientes={msiPendientes}
              quincenaPeriodo={quincenaPeriodo}
              vistaQuincenal={vistaQuincenal}
              modoTranquilo={modoTranquilo}
              diaAgotamiento={diaAgotamiento}
              limiteInput={limiteInput}
              guardandoLimite={guardandoLimite}
              onLimiteInputChange={setLimiteInput}
              onGuardarLimite={handleGuardarLimite}
              onToggleVistaQuincenal={handleToggleVistaQuincenal}
            />
          )}

          {burnRateAlerta && <BurnRateAlert />}

          <CollapsibleSection title="Ver más detalles">
            {recurrenteSugerido && (
              <RecurrenteSugeridoBanner
                sugerido={recurrenteSugerido}
                marcando={marcandoRecurrente}
                onMarcar={handleMarcarRecurrente}
                onDescartar={handleDescartarRecurrente}
              />
            )}

            {resumenFinMes && !cargando && <ResumenFinMesBanner resumen={resumenFinMes} />}

            {esMesActual &&
              !cargando &&
              (ingresoMensualTotal != null || patrimonioLiquido != null) && (
                <PatrimonioCards
                  ingresoMensualTotal={ingresoMensualTotal}
                  patrimonioLiquido={patrimonioLiquido}
                  limiteMensual={limiteMensual}
                />
              )}

            {esMesActual && !cargando && (
              <PresupuestoWidget
                disponible={disponible}
                presupuestoDiario={presupuestoDiario}
                limiteMensual={limiteMensual}
                diasRestantesEfectivos={diasRestantesEfectivos}
                recibosEfectivos={recibosEfectivos}
                msiPendientes={msiPendientes}
                quincenaPeriodo={quincenaPeriodo}
                vistaQuincenal={vistaQuincenal}
                modoTranquilo={modoTranquilo}
                diaAgotamiento={diaAgotamiento}
                limiteInput={limiteInput}
                guardandoLimite={guardandoLimite}
                onLimiteInputChange={setLimiteInput}
                onGuardarLimite={handleGuardarLimite}
                onToggleVistaQuincenal={handleToggleVistaQuincenal}
                mode="settings"
              />
            )}

            {proyeccionCierre && !cargando && (
              <ProyeccionCierre proyeccion={proyeccionCierre} ocultarAdvertencias={modoTranquilo} />
            )}

            {esMesActual && !cargando && (
              <MeAlcanzaWidget
                disponible={disponible}
                diasRestantesEfectivos={diasRestantesEfectivos}
                presupuestoDiario={presupuestoDiario}
              />
            )}

            {esMesActual && !cargando && <SaludAhorroWidget saludAhorro={saludAhorro} />}

            {!cargando && <CompromisosMsiWidget compromisos={compromisosMsi} />}

            {!cargando && tieneDatosAnalisis && (
              <GastosAnalisisSection resumen={resumen} evolucionMensual={evolucionMensual} />
            )}

            <MetasAhorroSection {...metasAhorro} />

            <PresupuestoSettings />
          </CollapsibleSection>

          <OfflineSyncStatus isSyncing={isSyncing} pendingCount={pendingCount} />

          <DashboardStatus
            error={error}
            cargando={cargando}
            sinGastos={resumen.length === 0}
          />
        </>
      )}
    </section>
  )
})
