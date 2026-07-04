import { memo, useEffect, useMemo, useState } from 'react'
import { useAuthSession, useFocusMode } from '../contexts'
import { useStableArray } from '../hooks/useStableArray'
import { supabase } from '../services/supabase'
import type { GastoRecurrente } from '../types/gasto'
import { getMonthFechaBounds } from '../utils/date'
import {
  filterMsiForMonth,
  isMonthInMsiCompromisosWindow,
  type GastoMsiTimelineRow,
} from '../utils/msiTimeline'
import { buildSalidasTimeline } from '../utils/salidasTimeline'
import SalidasTimeline from './SalidasTimeline'

interface SalidasTimelineSectionProps {
  selectedMonth?: Date
  recurrentes: GastoRecurrente[]
  gastosMsi?: GastoMsiTimelineRow[]
}

function SalidasTimelineSection({
  selectedMonth = new Date(),
  recurrentes,
  gastosMsi: gastosMsiProp,
}: SalidasTimelineSectionProps) {
  const { user } = useAuthSession()
  const { isFocusMode } = useFocusMode()
  const [gastosMsiLocal, setGastosMsiLocal] = useState<GastoMsiTimelineRow[]>([])

  const canReuseDashboardMsi =
    gastosMsiProp != null && isMonthInMsiCompromisosWindow(selectedMonth)

  useEffect(() => {
    if (!user || canReuseDashboardMsi) return

    const userId = user.id
    let cancelled = false

    async function cargarMsi() {
      const { inicio, fin } = getMonthFechaBounds(selectedMonth)
      const { data: msiData } = await supabase
        .from('gastos')
        .select('monto, fecha')
        .eq('user_id', userId)
        .eq('es_msi', true)
        .gte('fecha', inicio)
        .lt('fecha', fin)

      if (!cancelled) {
        setGastosMsiLocal(
          (msiData ?? []).map((item) => ({
            monto: Number(item.monto),
            fecha: item.fecha,
          })),
        )
      }
    }

    void cargarMsi()

    return () => {
      cancelled = true
    }
  }, [user, selectedMonth, canReuseDashboardMsi])

  const gastosMsi = useMemo(() => {
    if (canReuseDashboardMsi && gastosMsiProp) {
      return filterMsiForMonth(gastosMsiProp, selectedMonth)
    }
    return gastosMsiLocal
  }, [canReuseDashboardMsi, gastosMsiProp, gastosMsiLocal, selectedMonth])

  const stableRecurrentes = useStableArray(recurrentes)
  const stableGastosMsi = useStableArray(gastosMsi)

  const items = useMemo(
    () => buildSalidasTimeline(stableRecurrentes, stableGastosMsi, selectedMonth),
    [stableRecurrentes, stableGastosMsi, selectedMonth],
  )

  if (isFocusMode) return null

  return <SalidasTimeline items={items} />
}

export default memo(SalidasTimelineSection)
