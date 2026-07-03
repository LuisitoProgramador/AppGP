import { memo } from 'react'
import type { useMetasAhorro } from '../../hooks/useMetasAhorro'
import { formatCurrency } from '../../utils/formatCurrency'
import { getMetaProgress } from '../../utils/metaProgress'
import {
  formWithKeyboardClassName,
  inputClassName,
  buttonEmeraldClassName,
  buttonEmeraldFlexClassName,
  buttonEmeraldFullClassName,
  buttonGhostClassName,
  buttonSecondaryFlexClassName,
} from '../formStyles'

type MetasAhorroSectionProps = ReturnType<typeof useMetasAhorro>

export default memo(function MetasAhorroSection({
  metas,
  metasCargando,
  metasError,
  metasFromCache,
  mostrarFormMeta,
  setMostrarFormMeta,
  metaNombre,
  setMetaNombre,
  metaObjetivo,
  setMetaObjetivo,
  guardandoMeta,
  ahorroInputs,
  setAhorroInputs,
  sumandoMetaId,
  handleCrearMeta,
  handleSumarAhorro,
}: MetasAhorroSectionProps) {
  return (
    <div className="space-y-4 border-t border-slate-700/60 pt-5 transition-all duration-300">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-300">Metas de ahorro</h3>
        <p className="text-xs text-slate-500">
          Define un objetivo y suma ahorros de forma rápida
        </p>
      </div>

      {metasFromCache && metas.length > 0 && (
        <p className="text-xs text-amber-300">Mostrando metas guardadas localmente.</p>
      )}

      {metasError && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error al cargar metas: {metasError}
        </p>
      )}

      {metasCargando && (
        <p className="text-center text-sm text-slate-400">Cargando metas...</p>
      )}

      {!metasCargando && metas.length === 0 && !metasError && (
        <div className="space-y-3">
          <p className="text-center text-sm text-slate-400">Aún no tienes metas de ahorro.</p>
          {!mostrarFormMeta ? (
            <button
              type="button"
              onClick={() => setMostrarFormMeta(true)}
              className={buttonEmeraldFullClassName}
            >
              Crear meta
            </button>
          ) : (
            <form onSubmit={handleCrearMeta} className={`space-y-3 ${formWithKeyboardClassName}`}>
              <input
                type="text"
                inputMode="text"
                value={metaNombre}
                onChange={(e) => setMetaNombre(e.target.value)}
                placeholder="Nombre (ej. Vacaciones)"
                className={inputClassName}
                maxLength={100}
                required
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={metaObjetivo}
                onChange={(e) => setMetaObjetivo(e.target.value)}
                placeholder="Monto objetivo"
                className={inputClassName}
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarFormMeta(false)}
                  className={buttonSecondaryFlexClassName}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoMeta}
                  className={buttonEmeraldFlexClassName}
                >
                  {guardandoMeta ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!metasCargando && metas.length > 0 && (
        <div className="space-y-4">
          {metas.map((meta) => {
            const progress = getMetaProgress(meta)
            const isSumando = sumandoMetaId === meta.id

            return (
              <div
                key={meta.id}
                className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{meta.nombre}</p>
                    <p className="text-xs text-slate-400">
                      {formatCurrency(meta.monto_actual)} de{' '}
                      {formatCurrency(meta.monto_objetivo)} ({progress.toFixed(0)}%)
                    </p>
                  </div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-700/80">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={ahorroInputs[meta.id] ?? ''}
                    onChange={(e) =>
                      setAhorroInputs((current) => ({
                        ...current,
                        [meta.id]: e.target.value,
                      }))
                    }
                    placeholder="Sumar..."
                    className={`min-w-0 flex-1 ${inputClassName}`}
                    aria-label={`Sumar ahorro a ${meta.nombre}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleSumarAhorro(meta)}
                    disabled={isSumando}
                    className={`shrink-0 ${buttonEmeraldClassName}`}
                  >
                    {isSumando ? '...' : 'Sumar'}
                  </button>
                </div>
              </div>
            )
          })}

          {!mostrarFormMeta ? (
            <button
              type="button"
              onClick={() => setMostrarFormMeta(true)}
              className={`w-full ${buttonGhostClassName}`}
            >
              + Añadir otra meta
            </button>
          ) : (
            <form
              onSubmit={handleCrearMeta}
              className={`space-y-3 border-t border-slate-700/60 pt-4 ${formWithKeyboardClassName}`}
            >
              <input
                type="text"
                inputMode="text"
                value={metaNombre}
                onChange={(e) => setMetaNombre(e.target.value)}
                placeholder="Nombre de la nueva meta"
                className={inputClassName}
                maxLength={100}
                required
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={metaObjetivo}
                onChange={(e) => setMetaObjetivo(e.target.value)}
                placeholder="Monto objetivo"
                className={inputClassName}
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarFormMeta(false)}
                  className={buttonSecondaryFlexClassName}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoMeta}
                  className={buttonEmeraldFlexClassName}
                >
                  {guardandoMeta ? 'Guardando...' : 'Crear meta'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
})
