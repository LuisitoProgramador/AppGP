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
import { PORCENTAJE_AHORRO_DEFAULT } from '../constants/porcentajeAhorro'
import {
  calcAhorroMensual503020,
  calcPorcentajesRegla503020,
} from '../utils/finanzas/regla503020'
import { formatCurrency } from '../utils/format/formatCurrency'
import { showError, showSuccess } from '../utils/core/toast'
import {
  buttonPrimaryCompactClassName,
  buttonGhostClassName,
  inputClassName,
  settingsPanelClassName,
} from './ui/formStyles'

export default memo(function PersonalAppSettings() {
  const { user } = useAuthSession()
  const { categorias, reloadCategorias } = useCategorias(user?.id)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [ingresoMensual, setIngresoMensual] = useState<number | null>(null)
  const [porcentajeAhorro, setPorcentajeAhorro] = useState(PORCENTAJE_AHORRO_DEFAULT)
  const [limites, setLimites] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getPresupuesto(user.id).then((presupuesto) => {
      if (cancelled) return
      const ingreso = presupuesto ? getIngresoMensualTotal(presupuesto) : null
      setIngresoMensual(ingreso)
      setPorcentajeAhorro(presupuesto?.porcentaje_ahorro ?? PORCENTAJE_AHORRO_DEFAULT)
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
  const porcentajes = calcPorcentajesRegla503020(porcentajeAhorro)
  const ahorroObjetivo =
    ingresoMensual != null && ingresoMensual > 0
      ? calcAhorroMensual503020(ingresoMensual, porcentajeAhorro)
      : null

  return (
    <div className="space-y-6">
      <section className={settingsPanelClassName}>
        <h3 className="text-sm font-semibold text-white">Regla 50 / 30 / 20</h3>
        <p className="mt-1 text-xs text-slate-500">
          Necesidades y caprichos se reparten 50/30 sobre lo disponible para gastar; el ahorro lo
          defines en Presupuesto. Los límites por categoría se recalculan al guardar tu sueldo.
        </p>
        {ingresoMensual != null && ingresoMensual > 0 ? (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-slate-400">
              Ingreso mensual: {formatCurrency(ingresoMensual)} · Ahorro objetivo:{' '}
              {formatCurrency(ahorroObjetivo ?? 0)} ({porcentajes.ahorro}%)
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
