import { memo, useEffect, useMemo, useState } from 'react'
import { useAuthContext, useFocusMode } from '../contexts'
import { useStableArray } from '../hooks/useStableArray'
import { listGastosRecurrentes } from '../services/gastosRecurrentes'
import { supabase } from '../services/supabase'
import type { GastoRecurrente } from '../types/gasto'
import { getMonthRange } from '../utils/date'
import { buildSalidasTimeline } from '../utils/salidasTimeline'
import SalidasTimeline from './SalidasTimeline'

function SalidasTimelineSection() {
  const { user } = useAuthContext()
  const { isFocusMode } = useFocusMode()
  const [recurrentes, setRecurrentes] = useState<GastoRecurrente[]>([])
  const [gastosMsi, setGastosMsi] = useState<{ monto: number; fecha: string }[]>([])

  useEffect(() => {
    if (!user) return

    async function cargar() {
      const { data: recurrentesData } = await listGastosRecurrentes(user.id)
      setRecurrentes(recurrentesData)

      const { inicio, fin } = getMonthRange(new Date())
      const { data: msiData } = await supabase
        .from('gastos')
        .select('monto, fecha')
        .eq('user_id', user.id)
        .eq('es_msi', true)
        .gte('fecha', inicio.toISOString())
        .lt('fecha', fin.toISOString())

      setGastosMsi(
        (msiData ?? []).map((item) => ({
          monto: Number(item.monto),
          fecha: item.fecha,
        })),
      )
    }

    cargar()
  }, [user])

  const stableRecurrentes = useStableArray(recurrentes)
  const stableGastosMsi = useStableArray(gastosMsi)

  const items = useMemo(
    () => buildSalidasTimeline(stableRecurrentes, stableGastosMsi),
    [stableRecurrentes, stableGastosMsi],
  )

  if (isFocusMode) return null

  return <SalidasTimeline items={items} />
}

export default memo(SalidasTimelineSection)
