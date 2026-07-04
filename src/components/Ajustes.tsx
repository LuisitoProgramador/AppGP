import { memo } from 'react'
import PresupuestoSettings from './PresupuestoSettings'
import PersonalAppSettings from './PersonalAppSettings'
import {
  dashboardShellClassName,
  settingsPanelClassName,
} from './formStyles'

export default memo(function Ajustes() {
  return (
    <section className={dashboardShellClassName}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Ajustes</h2>
        <p className="text-sm text-slate-400">
          Estrategia financiera, categorías y preferencias personales
        </p>
      </header>

      <div className={settingsPanelClassName}>
        <PresupuestoSettings />
      </div>

      <PersonalAppSettings />
    </section>
  )
})
