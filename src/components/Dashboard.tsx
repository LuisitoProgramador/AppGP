import { memo, useState } from 'react'
import { useOfflineSync, useQuietMode, useFocusMode } from '../contexts'
import { useDashboardData } from '../hooks/useDashboardData'
import ListaCuentas from './ListaCuentas'
import ProyeccionCierre from './ProyeccionCierre'
import DashboardFocusView from './dashboard/DashboardFocusView'
import DashboardHeader from './dashboard/DashboardHeader'
import FocusModeToggle from './dashboard/FocusModeToggle'
import PresupuestoWidget from './dashboard/PresupuestoWidget'
import BurnRateAlert from './dashboard/BurnRateAlert'
import OfflineSyncStatus from './dashboard/OfflineSyncStatus'
import DashboardStatus from './dashboard/DashboardStatus'
import { dashboardShellClassName, formWithKeyboardClassName } from './formStyles'

export default memo(function Dashboard() {
  const { isSyncing, pendingCount } = useOfflineSync()
  const { modoTranquilo, toggleModoTranquilo } = useQuietMode()
  const { isFocusMode, toggleFocusMode } = useFocusMode()
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
    limiteInput,
    setLimiteInput,
    guardandoLimite,
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
    handleGuardarLimite,
    handleToggleModoViaje,
    handleToggleVistaQuincenal,
  } = useDashboardData(selectedMonth, [], { lite: isFocusMode })

  return (
    <div className={`flex flex-col gap-6 ${formWithKeyboardClassName}`}>
      <section className={dashboardShellClassName}>
        <FocusModeToggle isFocusMode={isFocusMode} onToggle={toggleFocusMode} />

        {isFocusMode ? (
          <DashboardFocusView
            esMesActual={esMesActual}
            cargando={cargando}
            focusView={focusView}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <DashboardHeader
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              gastoTotal={gastoTotal}
              cargando={cargando}
              modoViaje={modoViaje}
              modoTranquilo={modoTranquilo}
              onToggleModoViaje={handleToggleModoViaje}
              onToggleModoTranquilo={toggleModoTranquilo}
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

            {!isFocusMode && <ListaCuentas embedded />}

            {burnRateAlerta && <BurnRateAlert />}

            {proyeccionCierre && !cargando && (
              <ProyeccionCierre proyeccion={proyeccionCierre} ocultarAdvertencias={modoTranquilo} />
            )}

            <OfflineSyncStatus isSyncing={isSyncing} pendingCount={pendingCount} />

            <DashboardStatus
              error={error}
              cargando={cargando}
              sinGastos={resumen.length === 0}
            />
          </div>
        )}
      </section>
    </div>
  )
})
