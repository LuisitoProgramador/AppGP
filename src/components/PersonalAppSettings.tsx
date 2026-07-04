import { type FormEvent, memo, useEffect, useState } from 'react'
import { useAuthSession } from '../contexts'
import { useCategorias } from '../hooks/useCategorias'
import {
  addCategoriaUsuario,
  getCategoriasCustom,
  removeCategoriaCustom,
} from '../services/categorias'
import { getPresupuesto, getIngresoMensualTotal } from '../services/presupuesto'
import { getLimitesPorCategoria } from '../services/presupuestoCategorias'
import { REGLA_503020 } from '../constants/regla503020'
import { calcAhorroMensual503020 } from '../utils/regla503020'
import { formatCurrency } from '../utils/formatCurrency'
import { showError, showSuccess } from '../utils/toast'
import {
  buttonPrimaryCompactClassName,
  buttonGhostClassName,
  inputClassName,
  settingsPanelClassName,
} from './formStyles'

export default memo(function PersonalAppSettings() {
  const { user } = useAuthSession()
  const { categorias, reloadCategorias } = useCategorias(user?.id)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [ingresoMensual, setIngresoMensual] = useState<number | null>(null)
  const [limites, setLimites] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getPresupuesto(user.id).then((presupuesto) => {
      if (cancelled) return
      const ingreso = presupuesto ? getIngresoMensualTotal(presupuesto) : null
      setIngresoMensual(ingreso)
      setLimites(getLimitesPorCategoria(user.id))
    })
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) return null

  function handleAddCategoria(event: FormEvent) {
    event.preventDefault()
    const result = addCategoriaUsuario(user!.id, nuevaCategoria)
    if (!result.ok) {
      showError(result.error ?? 'No se pudo agregar.')
      return
    }
    setNuevaCategoria('')
    reloadCategorias()
    showSuccess('Categoría agregada.')
  }

  const custom = getCategoriasCustom(user.id)
  const ahorroObjetivo =
    ingresoMensual != null && ingresoMensual > 0
      ? calcAhorroMensual503020(ingresoMensual)
      : null

  return (
    <div className="space-y-6">
      <section className={settingsPanelClassName}>
        <h3 className="text-sm font-semibold text-white">Regla 50 / 30 / 20</h3>
        <p className="mt-1 text-xs text-slate-500">
          50% necesidades (Comida, Transporte, Casa) · 30% caprichos (Suscripciones, Compras,
          Otros) · 20% ahorro. Los límites por categoría se recalculan al guardar tu sueldo en
          Ajustes → Presupuesto.
        </p>
        {ingresoMensual != null && ingresoMensual > 0 ? (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-slate-400">
              Ingreso mensual: {formatCurrency(ingresoMensual)} · Ahorro objetivo:{' '}
              {formatCurrency(ahorroObjetivo ?? 0)} (
              {Math.round(REGLA_503020.ahorro * 100)}%)
            </p>
            <ul className="space-y-1.5 text-sm text-slate-300">
              {categorias.map((categoria) => {
                const limite = limites[categoria]
                if (limite == null) return null
                return (
                  <li key={categoria} className="flex justify-between gap-2">
                    <span>{categoria}</span>
                    <span className="text-slate-400">{formatCurrency(limite)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            Configura tu sueldo en Presupuesto para ver los límites automáticos.
          </p>
        )}
      </section>

      <section className={settingsPanelClassName}>
        <h3 className="text-sm font-semibold text-white">Categorías</h3>
        <p className="mt-1 text-xs text-slate-500">
          Comida · Transporte · Casa · Suscripciones · Compras · Otros
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-300">
          {categorias.map((c) => (
            <li key={c} className="flex items-center justify-between gap-2">
              <span>{c}</span>
              {custom.includes(c) && (
                <button
                  type="button"
                  className={buttonGhostClassName}
                  onClick={() => {
                    removeCategoriaCustom(user.id, c)
                    reloadCategorias()
                  }}
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddCategoria} className="mt-3 flex gap-2">
          <input
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            placeholder="Nueva categoría"
            className={inputClassName}
          />
          <button type="submit" className={buttonPrimaryCompactClassName}>
            Agregar
          </button>
        </form>
      </section>

      <section className={settingsPanelClassName}>
        <h3 className="text-sm font-semibold text-white">Tu app personal</h3>
        <ul className="mt-2 space-y-2 text-xs text-slate-400">
          <li>
            <strong className="text-slate-300">Sin banco conectado:</strong> tus datos quedan en
            tus manos. Registro manual, sin sync bancario ni publicidad.
          </li>
          <li>
            <strong className="text-slate-300">Offline:</strong> puedes registrar gastos,
            ingresos y crear cuentas sin internet.
          </li>
          <li>
            <strong className="text-slate-300">iPhone:</strong> agrega a inicio para abrir Pulso
            como app nativa.
          </li>
        </ul>
      </section>

      <section className={settingsPanelClassName}>
        <h3 className="text-sm font-semibold text-white">Notificaciones Telegram</h3>
        <p className="mt-1 text-xs text-slate-500">
          Variables en Vercel según <code className="text-slate-400">.env.example</code>.
        </p>
      </section>
    </div>
  )
})
