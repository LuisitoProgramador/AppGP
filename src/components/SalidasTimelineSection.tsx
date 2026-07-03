import { useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../contexts'
import { listGastosRecurrentes } from '../services/gastosRecurrentes'
import { supabase } from '../services/supabase'
import type { GastoRecurrente } from '../types/gasto'
import { getMonthRange } from '../utils/date'
import { buildSalidasTimeline } from '../utils/salidasTimeline'
import SalidasTimeline from './SalidasTimeline'

export default function SalidasTimelineSection() {
  const { user } = useAuthContext()
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

  const items = useMemo(
    () => buildSalidasTimeline(recurrentes, gastosMsi),
    [recurrentes, gastosMsi],
  )

  return <SalidasTimeline items={items} />
}
