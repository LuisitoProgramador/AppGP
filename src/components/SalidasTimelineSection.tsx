import { memo, useEffect, useMemo, useState } from 'react'
import { useAuthContext, useFocusMode } from '../contexts'
import { useStableArray } from '../hooks/useStableArray'
import { listGastosRecurrentes } from '../services/gastosRecurrentes'
import { supabase } from '../services/supabase'
import type { GastoRecurrente } from '../types/gasto'
import { getMonthFechaBounds } from '../utils/date'
import { buildSalidasTimeline } from '../utils/salidasTimeline'
import SalidasTimeline from './SalidasTimeline'

interface SalidasTimelineSectionProps {
  selectedMonth?: Date
  recurrentes?: GastoRecurrente[]
}

function SalidasTimelineSection({
  selectedMonth = new Date(),
  recurrentes: recurrentesProp,
}: SalidasTimelineSectionProps) {
  const { user } = useAuthContext()
  const { isFocusMode } = useFocusMode()
  const [recurrentesLocal, setRecurrentesLocal] = useState<GastoRecurrente[]>([])
  const [gastosMsi, setGastosMsi] = useState<{ monto: number; fecha: string }[]>([])

  const recurrentes = recurrentesProp ?? recurrentesLocal

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function cargar() {
      if (recurrentesProp === undefined) {
        const { data: recurrentesData } = await listGastosRecurrentes(user.id)
        if (!cancelled) setRecurrentesLocal(recurrentesData)
      }

      const { inicio, fin } = getMonthFechaBounds(selectedMonth)
      const { data: msiData } = await supabase
        .from('gastos')
        .select('monto, fecha')
        .eq('user_id', user.id)
        .eq('es_msi', true)
        .gte('fecha', inicio)
        .lt('fecha', fin)

      if (!cancelled) {
        setGastosMsi(
          (msiData ?? []).map((item) => ({
            monto: Number(item.monto),
            fecha: item.fecha,
          })),
        )
      }
    }

    cargar()

    return () => {
      cancelled = true
    }
  }, [user, selectedMonth, recurrentesProp])

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
