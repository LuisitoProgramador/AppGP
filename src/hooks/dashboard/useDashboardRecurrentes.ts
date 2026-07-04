import { useEffect, useState } from 'react'
import { useRecurrentes } from '../../contexts'
import {
  detectarRecurrentesSugeridos,
  isRecurrenteSugeridoDismissed,
  type RecurrenteSugerido,
} from '../../utils/dashboard/detectarRecurrentes'

type PatronGasto = {
  descripcion: string
  monto: number
  categoria: string
  fecha: string
}

export function useDashboardRecurrentes(
  patronGastos: PatronGasto[],
  lite: boolean,
) {
  const { recurrentes, cargando: recurrentesCargando } = useRecurrentes()
  const [recurrenteSugerido, setRecurrenteSugerido] = useState<RecurrenteSugerido | null>(null)

  useEffect(() => {
    if (lite || recurrentesCargando) return

    const sugeridos = detectarRecurrentesSugeridos(patronGastos, recurrentes).filter(
      (item) => !isRecurrenteSugeridoDismissed(item.descripcion),
    )

    setRecurrenteSugerido(sugeridos[0] ?? null)
  }, [lite, recurrentesCargando, recurrentes, patronGastos])

  return {
    recurrentes,
    recurrenteSugerido,
    setRecurrenteSugerido,
  }
}
