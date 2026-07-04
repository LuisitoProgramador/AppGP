import { memo } from 'react'
import GastosRecurrentes from './GastosRecurrentes'
import Metas from './Metas'

export default memo(function Plan() {
  return (
    <div className="space-y-6">
      <GastosRecurrentes />
      <Metas />
    </div>
  )
})
