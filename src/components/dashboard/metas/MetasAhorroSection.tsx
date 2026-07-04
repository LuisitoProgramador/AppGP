import { memo } from 'react'
import type { useMetasAhorro } from '../../../hooks/useMetasAhorro'
import { nombreMetaAhorroAnual } from '../../../utils/finanzas/metaCalendario'
import { buttonPrimaryFullClassName } from '../../ui/formStyles'
import MetasAhorroForm from './MetasAhorroForm'
import MetasAhorroList from './MetasAhorroList'

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
          <p className="text-center text-xs text-slate-500">
            Al guardar tu presupuesto, Pulso crea sola la meta{' '}
            <span className="text-slate-400">“{nombreMetaAhorroAnual(new Date().getFullYear())}”</span>{' '}
            prorrateada hasta fin de año.
          </p>
          {!mostrarFormMeta ? (
            <button
              type="button"
              onClick={() => setMostrarFormMeta(true)}
              className={buttonPrimaryFullClassName}
            >
              Crear meta
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
              objetivoInputId="meta-objetivo-nueva"
              nombrePlaceholder="Nombre (ej. Vacaciones)"
              submitLabel="Crear"
            />
          )}
        </div>
      )}

      {!metasCargando && metas.length > 0 && (
        <MetasAhorroList
          metas={metas}
          mostrarFormMeta={mostrarFormMeta}
          setMostrarFormMeta={setMostrarFormMeta}
          metaNombre={metaNombre}
          setMetaNombre={setMetaNombre}
          metaObjetivo={metaObjetivo}
          setMetaObjetivo={setMetaObjetivo}
          guardandoMeta={guardandoMeta}
          ahorroInputs={ahorroInputs}
          setAhorroInputs={setAhorroInputs}
          sumandoMetaId={sumandoMetaId}
          handleCrearMeta={handleCrearMeta}
          handleSumarAhorro={handleSumarAhorro}
          editandoMetaId={editandoMetaId}
          editNombre={editNombre}
          setEditNombre={setEditNombre}
          editObjetivo={editObjetivo}
          setEditObjetivo={setEditObjetivo}
          guardandoEdicionMeta={guardandoEdicionMeta}
          eliminandoMetaId={eliminandoMetaId}
          iniciarEdicionMeta={iniciarEdicionMeta}
          cancelarEdicionMeta={cancelarEdicionMeta}
          handleGuardarEdicionMeta={handleGuardarEdicionMeta}
          handleEliminarMeta={handleEliminarMeta}
          esMetaAhorroAnual={esMetaAhorroAnual}
        />
      )}
    </div>
  )
})
