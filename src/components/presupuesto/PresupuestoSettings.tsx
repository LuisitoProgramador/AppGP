import { DIAS_PAGO_SELECT_OPTIONS } from '../../constants/formOptions'
import { formatCurrency } from '../../utils/format/formatCurrency'
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  formWithKeyboardClassName,
} from '../ui/formStyles'
import Select from '../ui/Select'
import MontoInput from '../ui/MontoInput'
import Regla503020Preview from './Regla503020Preview'
import { usePresupuestoSettings } from '../../hooks/forms/usePresupuestoSettings'

export default function PresupuestoSettings() {
  const {
    cargando,
    guardando,
    aplicandoLimite,
    limiteEsManual,
    limiteManualActual,
    sueldoMensual,
    setSueldoMensual,
    ingresosExtras,
    setIngresosExtras,
    porcentajeAhorro,
    setPorcentajeAhorro,
    diaPago,
    setDiaPago,
    estrategiaPreview,
    ahorroSemanalPreview,
    diferenciaAhorroMensual,
    presupuestoDiarioPreview,
    ingresoMensualPreview,
    regla503020Preview,
    hayCambios,
    handleSubmit,
    handleAplicarLimiteCalculado,
    porcentajeAhorroMin,
    porcentajeAhorroMax,
    porcentajeAhorroStep,
  } = usePresupuestoSettings()

  if (cargando) {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-slate-400">Cargando configuración...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-300">Tu situación financiera</h3>
        <p className="text-xs text-slate-500">
          Tu sueldo define la regla 50/30/20: límites por categoría, necesidades, caprichos y
          ahorro del 20%
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-5 ${formWithKeyboardClassName}`}>
        <div className="space-y-2">
          <label htmlFor="cfg-sueldo" className="block text-sm font-medium text-slate-300">
            Sueldo mensual
          </label>
          <MontoInput
            id="cfg-sueldo"
            value={sueldoMensual}
            onChange={setSueldoMensual}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="cfg-extras" className="block text-sm font-medium text-slate-300">
            Ingresos extras mensuales
            <span className="ml-1 font-normal text-slate-500">(opcional)</span>
          </label>
          <MontoInput
            id="cfg-extras"
            value={ingresosExtras}
            onChange={setIngresosExtras}
            placeholder="Bonos, ventas, intereses..."
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="cfg-ahorro" className="text-sm font-medium text-slate-300">
              Porcentaje de ahorro
            </label>
            <span className="text-lg font-bold text-pulso-accent-muted">{porcentajeAhorro}%</span>
          </div>
          <input
            id="cfg-ahorro"
            type="range"
            min={porcentajeAhorroMin}
            max={porcentajeAhorroMax}
            step={porcentajeAhorroStep}
            value={porcentajeAhorro}
            onChange={(e) => setPorcentajeAhorro(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-pulso-accent"
            aria-label="Porcentaje de ahorro"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{porcentajeAhorroMin}%</span>
            <span>{porcentajeAhorroMax}%</span>
          </div>
          {ahorroSemanalPreview != null && ahorroSemanalPreview > 0 && (
            <p className="text-xs text-slate-400">
              ≈ {formatCurrency(ahorroSemanalPreview)} de ahorro por semana
            </p>
          )}
          {diferenciaAhorroMensual != null && diferenciaAhorroMensual !== 0 && hayCambios && (
            <p
              className={`rounded-lg px-3 py-2 text-xs ${
                diferenciaAhorroMensual > 0
                  ? 'border border-pulso-accent/30 bg-pulso-accent/10 text-pulso-accent-muted'
                  : 'border border-pulso-warning/30 bg-pulso-warning/10 text-pulso-warning'
              }`}
            >
              {diferenciaAhorroMensual > 0
                ? `Con este cambio, ahora ahorrarás ${formatCurrency(diferenciaAhorroMensual)} más al mes`
                : `Con este cambio, ahorrarás ${formatCurrency(Math.abs(diferenciaAhorroMensual))} menos al mes`}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="cfg-dia-pago" className="block text-sm font-medium text-slate-300">
            Día de pago semanal
          </label>
          <Select
            id="cfg-dia-pago"
            value={String(diaPago)}
            onChange={(value) => setDiaPago(Number(value))}
            aria-label="Día de pago semanal"
            options={DIAS_PAGO_SELECT_OPTIONS}
          />
          <p className="text-xs text-slate-500">
            El día de la semana en que recibes tu sueldo semanal
          </p>
        </div>

        {regla503020Preview && (
          <Regla503020Preview
            ingresoMensualPreview={ingresoMensualPreview}
            regla503020Preview={regla503020Preview}
          />
        )}

        {estrategiaPreview && (
          <div className={`grid gap-2 ${presupuestoDiarioPreview != null ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="rounded-xl border border-pulso-accent/25 bg-pulso-accent/10 px-3 py-2.5 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {limiteEsManual ? 'Límite calculado' : 'Disponible para gasto'}
              </p>
              <p className="mt-0.5 text-lg font-bold text-pulso-accent-muted">
                {formatCurrency(estrategiaPreview.disponibleParaGasto)}
              </p>
            </div>
            {presupuestoDiarioPreview != null && (
              <div className="rounded-xl border border-pulso-accent/25 bg-pulso-accent/10 px-3 py-2.5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Presupuesto diario estimado
                </p>
                <p className="mt-0.5 text-lg font-bold text-pulso-accent-muted">
                  {formatCurrency(presupuestoDiarioPreview)}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-slate-500">
                  Referencia teórica (sin gastos del mes). El disponible real está en el inicio.
                </p>
              </div>
            )}
          </div>
        )}

        {limiteEsManual && limiteManualActual != null && estrategiaPreview && (
          <div className="space-y-3 rounded-xl border border-pulso-warning/30 bg-pulso-warning/10 px-4 py-3">
            <p className="text-sm text-pulso-warning/90">
              Tienes un límite manual de{' '}
              <span className="font-semibold">{formatCurrency(limiteManualActual)}</span> en el
              resumen. Guardar la estrategia no lo cambia; el calculado sería{' '}
              {formatCurrency(estrategiaPreview.disponibleParaGasto)}.
            </p>
            <button
              type="button"
              onClick={handleAplicarLimiteCalculado}
              disabled={aplicandoLimite}
              className={`w-full ${buttonSecondaryClassName}`}
            >
              {aplicandoLimite ? (
                'Aplicando...'
              ) : (
                <>
                  <span className="block">Usar límite calculado</span>
                  <span className="mt-0.5 block text-sm font-bold text-white">
                    {formatCurrency(estrategiaPreview.disponibleParaGasto)}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={guardando || !hayCambios}
          className={buttonPrimaryClassName}
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
