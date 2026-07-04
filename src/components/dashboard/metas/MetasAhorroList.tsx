import { memo, type Dispatch, type FormEventHandler, type SetStateAction } from 'react'
import type { MetaAhorro } from '../../../types/metaAhorro'
import { formatCurrency } from '../../../utils/format/formatCurrency'
import { getMetaProgress } from '../../../utils/finanzas/metaProgress'
import { periodoMetaLabel } from '../../../utils/finanzas/metaCalendario'
import {
  formWithKeyboardClassName,
  inputClassName,
  inputInlineClassName,
  buttonPrimaryCompactClassName,
  buttonGhostClassName,
  buttonPrimaryFlexClassName,
  buttonSecondaryFlexClassName,
  iconButtonDangerClassName,
  iconButtonEditClassName,
  formSubmitClassName,
} from '../../ui/formStyles'
import { EditIcon, TrashIcon } from '../../ui/icons'
import MontoInput from '../../ui/MontoInput'
import MetasAhorroForm from './MetasAhorroForm'

type MetasAhorroListProps = {
  metas: MetaAhorro[]
  mostrarFormMeta: boolean
  setMostrarFormMeta: (value: boolean) => void
  metaNombre: string
  setMetaNombre: (value: string) => void
  metaObjetivo: string
  setMetaObjetivo: (value: string) => void
  guardandoMeta: boolean
  ahorroInputs: Record<string, string>
  setAhorroInputs: Dispatch<SetStateAction<Record<string, string>>>
  sumandoMetaId: number | null
  handleCrearMeta: FormEventHandler<HTMLFormElement>
  handleSumarAhorro: (meta: MetaAhorro) => void
  editandoMetaId: number | null
  editNombre: string
  setEditNombre: (value: string) => void
  editObjetivo: string
  setEditObjetivo: (value: string) => void
  guardandoEdicionMeta: boolean
  eliminandoMetaId: number | null
  iniciarEdicionMeta: (meta: MetaAhorro) => void
  cancelarEdicionMeta: () => void
  handleGuardarEdicionMeta: (meta: MetaAhorro) => void | Promise<void>
  handleEliminarMeta: (meta: MetaAhorro) => void | Promise<void>
  esMetaAhorroAnual: (meta: MetaAhorro) => boolean
}

export default memo(function MetasAhorroList({
  metas,
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
}: MetasAhorroListProps) {
  return (
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
                <div className={formSubmitClassName}>
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
        <MetasAhorroForm
          metaNombre={metaNombre}
          setMetaNombre={setMetaNombre}
          metaObjetivo={metaObjetivo}
          setMetaObjetivo={setMetaObjetivo}
          guardandoMeta={guardandoMeta}
          handleCrearMeta={handleCrearMeta}
          onCancel={() => setMostrarFormMeta(false)}
          objetivoInputId="meta-objetivo-extra"
          nombrePlaceholder="Nombre de la nueva meta"
          submitLabel="Crear meta"
          className="space-y-3 border-t border-slate-700/60 pt-4"
        />
      )}
    </div>
  )
})
