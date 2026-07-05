import { memo } from 'react'
import type { AppTab } from '../app/AppRoutes'
import { TABS } from '../app/AppRoutes'
import { navTopTabClassName } from './formStyles'

interface TopNavProps {
  activeTab: AppTab
  onChange: (tab: AppTab) => void
}

function TopNav({ activeTab, onChange }: TopNavProps) {
  return (
    <nav
      className="-mx-4 grid grid-cols-4 gap-1 border-b border-white/10 bg-pulso-bg px-2 py-2 sm:-mx-0 sm:rounded-xl sm:border sm:px-1"
      role="tablist"
      aria-label="Navegación principal"
    >
      {TABS.map(({ id, label, shortLabel, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`tab-${id}`}
          aria-selected={activeTab === id}
          aria-label={label}
          aria-controls={`panel-${id}`}
          data-testid={`nav-tab-${id}`}
          onClick={() => onChange(id)}
          className={navTopTabClassName(activeTab === id)}
        >
          <Icon />
          <span className="text-[10px] font-semibold leading-none sm:text-xs">{shortLabel}</span>
        </button>
      ))}
    </nav>
  )
}

export default memo(TopNav)
