import { memo, useMemo, useState } from 'react'
import { calcMeAlcanza } from '../../utils/meAlcanza'
import { inputClassName } from '../formStyles'

interface MeAlcanzaWidgetProps {
  disponible: number
  diasRestantesEfectivos: number
  presupuestoDiario: number
}

export default memo(function MeAlcanzaWidget({
  disponible,
  diasRestantesEfectivos,
  presupuestoDiario,
}: MeAlcanzaWidgetProps) {
  const [mostrar, setMostrar] = useState(false)
  const [monto, setMonto] = useState('')

  const resultado = useMemo(() => {
    return calcMeAlcanza({
      disponible,
      diasRestantes: diasRestantesEfectivos,
      montoEstimado: Number(monto),
      presupuestoDiarioActual: presupuestoDiario,
    })
  }, [disponible, diasRestantesEfectivos, monto, presupuestoDiario])

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40">
      <button
        type="button"
        onClick={() => setMostrar((current) => !current)}
        className="flex w-full min-h-11 items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-300 touch-manipulation transition active:scale-[0.98] active:bg-slate-700/50 hover:text-white"
        aria-expanded={mostrar}
      >
        <span>¿Me alcanza para...?</span>
        <span className="text-xs text-slate-500">{mostrar ? '▲' : '▼'}</span>
      </button>
      {mostrar && (
        <div className="space-y-2 border-t border-slate-700/60 px-4 py-3">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="Monto estimado"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={inputClassName}
          />
          {resultado && (
            <p
              className={`text-sm ${
                resultado.tono === 'bien'
                  ? 'text-emerald-400'
                  : resultado.tono === 'apretado'
                    ? 'text-amber-400'
                    : 'text-amber-300'
              }`}
            >
              {resultado.mensaje}
            </p>
          )}
        </div>
      )}
    </div>
  )
})
