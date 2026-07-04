import { memo } from 'react'
import { useMetasAhorro } from '../hooks/useMetasAhorro'
import MetasAhorroSection from './dashboard/MetasAhorroSection'
import PresupuestoSettings from './PresupuestoSettings'
import {
  dashboardShellClassName,
  formWithKeyboardClassName,
  settingsDividerClassName,
  settingsPanelClassName,
} from './formStyles'

export default memo(function Ajustes() {
  const metasAhorro = useMetasAhorro(true)

  return (
    <section className={`${dashboardShellClassName} ${formWithKeyboardClassName}`}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Ajustes</h2>
        <p className="text-sm text-slate-400">
          Configura tu estrategia financiera y metas de ahorro
        </p>
      </header>

      <div className={settingsPanelClassName}>
        <PresupuestoSettings />

        <div className={settingsDividerClassName}>
          <MetasAhorroSection {...metasAhorro} />
        </div>
      </div>
    </section>
  )
})
