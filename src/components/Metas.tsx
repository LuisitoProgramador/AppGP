import { memo } from 'react'
import { useMetasAhorro } from '../hooks/useMetasAhorro'
import MetasAhorroSection from './dashboard/MetasAhorroSection'
import { dashboardShellClassName } from './formStyles'

export default memo(function Metas() {
  const metasAhorro = useMetasAhorro(true)

  return (
    <section className={dashboardShellClassName}>
      <MetasAhorroSection {...metasAhorro} />
    </section>
  )
})
