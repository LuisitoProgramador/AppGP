import { memo } from 'react'
import type { useMetasAhorro } from '../../hooks/useMetasAhorro'
import { formatCurrency } from '../../utils/formatCurrency'
import { getMetaProgress } from '../../utils/metaProgress'
import { periodoMetaLabel } from '../../utils/metaCalendario'
import {
  formWithKeyboardClassName,
  inputClassName,
  inputInlineClassName,
  buttonPrimaryCompactClassName,
  buttonPrimaryFlexClassName,
  buttonPrimaryFullClassName,
  buttonGhostClassName,
  buttonSecondaryFlexClassName,
  iconButtonDangerClassName,
  iconButtonEditClassName,
} from '../formStyles'
import { EditIcon, TrashIcon } from '../icons'
import MontoInput from '../MontoInput'

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
  editandoMetaId,
  editNombre,
  setEditNombre,
  editObjetivo,
  setEditObjetivo,
  guardandoEdicionMeta,
  eliminandoMetaId,
  iniciarEdicionMeta,
  cancelarEdicionMeta,
  handleGuardarEdicionMeta,
  handleEliminarMeta,
  esMetaAhorroAnual,
}: MetasAhorroSectionProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-300">Metas de ahorro</h3>
        <p className="text-xs text-slate-500">
          Define un objetivo y suma ahorros de forma rápida
        </p>
      </div>

      {metasFromCache && metas.length > 0 && (
        <p className="text-xs text-pulso-warning">Mostrando metas guardadas localmente.</p>
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
              className={buttonPrimaryFullClassName}
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
              <MontoInput
                id="meta-objetivo-nueva"
                value={metaObjetivo}
                onChange={setMetaObjetivo}
                placeholder="Monto objetivo"
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
                  className={buttonPrimaryFlexClassName}
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
            const isEditando = editandoMetaId === meta.id
            const esAnual = esMetaAhorroAnual(meta)

            return (
              <div
                key={meta.id}
                className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3"
              >
                {isEditando ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      void handleGuardarEdicionMeta(meta)
                    }}
                    className={`space-y-3 ${formWithKeyboardClassName}`}
                  >
                    <input
                      type="text"
                      inputMode="text"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      placeholder="Nombre"
                      className={inputClassName}
                      maxLength={100}
                      required
                    />
                    <MontoInput
                      id={`meta-edit-objetivo-${meta.id}`}
                      value={editObjetivo}
                      onChange={setEditObjetivo}
                      placeholder="Monto objetivo"
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={cancelarEdicionMeta}
                        className={buttonSecondaryFlexClassName}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={guardandoEdicionMeta}
                        className={buttonPrimaryFlexClassName}
                      >
                        {guardandoEdicionMeta ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{meta.nombre}</p>
                        <p className="text-xs text-slate-400">
                          {formatCurrency(meta.monto_actual)} de{' '}
                          {formatCurrency(meta.monto_objetivo)} ({progress.toFixed(0)}%)
                          {meta.fecha_limite && (
                            <span className="text-slate-500"> · {periodoMetaLabel(meta)}</span>
                          )}
                        </p>
                        {esAnual && (
                          <p className="mt-1 text-[10px] text-slate-500">
                            Se actualiza con tu presupuesto semanal
                          </p>
                        )}
                      </div>
                      {!esAnual && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => iniciarEdicionMeta(meta)}
                            aria-label={`Editar meta ${meta.nombre}`}
                            className={iconButtonEditClassName}
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleEliminarMeta(meta)}
                            disabled={eliminandoMetaId === meta.id}
                            aria-label={`Eliminar meta ${meta.nombre}`}
                            className={iconButtonDangerClassName}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-700/80">
                      <div
                        className="h-full rounded-full bg-pulso-accent transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <MontoInput
                        id={`meta-sumar-${meta.id}`}
                        value={ahorroInputs[meta.id] ?? ''}
                        onChange={(value) =>
                          setAhorroInputs((current) => ({
                            ...current,
                            [meta.id]: value,
                          }))
                        }
                        placeholder="Sumar..."
                        className={inputInlineClassName}
                        aria-label={`Sumar ahorro a ${meta.nombre}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSumarAhorro(meta)}
                        disabled={isSumando}
                        className={buttonPrimaryCompactClassName}
                      >
                        {isSumando ? '...' : 'Sumar'}
                      </button>
                    </div>
                  </>
                )}
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
              <MontoInput
                id="meta-objetivo-extra"
                value={metaObjetivo}
                onChange={setMetaObjetivo}
                placeholder="Monto objetivo"
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
                  className={buttonPrimaryFlexClassName}
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
