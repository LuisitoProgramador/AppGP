import { type FormEvent, memo, useState } from 'react'
import { useAuthSession } from '../contexts'
import { useCategorias } from '../hooks/useCategorias'
import {
  addCategoriaUsuario,
  getCategoriasCustom,
  removeCategoriaCustom,
} from '../services/categorias'
import {
  addCategoryRule,
  getCategoryRules,
  removeCategoryRule,
} from '../services/categoryRules'
import {
  getLimitesPorCategoria,
  setLimiteCategoria,
} from '../services/presupuestoCategorias'
import { formatMontoFromNumber, parseMontoValue } from '../utils/montoInput'
import { showError, showSuccess } from '../utils/toast'
import {
  buttonPrimaryCompactClassName,
  buttonGhostClassName,
  inputClassName,
  settingsPanelClassName,
} from './formStyles'
import Select from './Select'

export default memo(function PersonalAppSettings() {
  const { user } = useAuthSession()
  const { categorias, reloadCategorias, selectOptions } = useCategorias(user?.id)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [reglaPatron, setReglaPatron] = useState('')
  const [reglaCategoria, setReglaCategoria] = useState(categorias[0] ?? 'Otros')
  const [rules, setRules] = useState(() => (user ? getCategoryRules(user.id) : []))
  const [limites, setLimites] = useState(() => (user ? getLimitesPorCategoria(user.id) : {}))

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

  function handleAddRule(event: FormEvent) {
    event.preventDefault()
    const result = addCategoryRule(user!.id, reglaPatron, reglaCategoria)
    if (!result.ok) {
      showError(result.error ?? 'No se pudo agregar.')
      return
    }
    setReglaPatron('')
    setRules(getCategoryRules(user!.id))
    showSuccess('Regla guardada.')
  }

  function handleLimite(categoria: string, value: string) {
    const monto = value.trim() ? parseMontoValue(value) : null
    setLimiteCategoria(user!.id, categoria, monto)
    setLimites(getLimitesPorCategoria(user!.id))
  }

  const custom = getCategoriasCustom(user.id)

  return (
    <div className="space-y-6">
      <section className={settingsPanelClassName}>
        <h3 className="text-sm font-semibold text-white">Categorías</h3>
        <p className="mt-1 text-xs text-slate-500">
          Personaliza hasta 15 categorías. Las 5 base siempre están disponibles.
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
        <h3 className="text-sm font-semibold text-white">Reglas de categoría</h3>
        <p className="mt-1 text-xs text-slate-500">
          Si la descripción contiene el texto, se asigna la categoría al registrar.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-2 text-slate-300">
              <span>
                “{rule.patron}” → {rule.categoria}
              </span>
              <button
                type="button"
                className={buttonGhostClassName}
                onClick={() => {
                  removeCategoryRule(user.id, rule.id)
                  setRules(getCategoryRules(user.id))
                }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddRule} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={reglaPatron}
            onChange={(e) => setReglaPatron(e.target.value)}
            placeholder="Ej. oxxo, uber"
            className={inputClassName}
          />
          <Select
            value={reglaCategoria}
            onChange={setReglaCategoria}
            options={selectOptions}
            aria-label="Categoría de la regla"
          />
          <button type="submit" className={buttonPrimaryCompactClassName}>
            Guardar
          </button>
        </form>
      </section>

      <section className={settingsPanelClassName}>
        <h3 className="text-sm font-semibold text-white">Límite por categoría (opcional)</h3>
        <p className="mt-1 text-xs text-slate-500">
          Solo para ti; Pulso avisa al 80% en Resumen.
        </p>
        <div className="mt-3 space-y-2">
          {categorias.slice(0, 8).map((categoria) => (
            <label key={categoria} className="flex items-center gap-2 text-sm text-slate-300">
              <span className="w-28 shrink-0 truncate">{categoria}</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Sin límite"
                defaultValue={
                  limites[categoria] != null ? formatMontoFromNumber(limites[categoria]) : ''
                }
                onBlur={(e) => handleLimite(categoria, e.target.value)}
                className={inputClassName}
              />
            </label>
          ))}
        </div>
      </section>

      <section className={settingsPanelClassName}>
        <h3 className="text-sm font-semibold text-white">Tu app personal</h3>
        <ul className="mt-2 space-y-2 text-xs text-slate-400">
          <li>
            <strong className="text-slate-300">Sin banco conectado:</strong> tus datos quedan en
            tus manos. Registro manual rápido, sin sync bancario ni publicidad.
          </li>
          <li>
            <strong className="text-slate-300">Offline:</strong> puedes registrar gastos y crear
            cuentas sin internet. Transferencias, ingresos y ajustes de presupuesto requieren
            conexión.
          </li>
          <li>
            <strong className="text-slate-300">Pendientes:</strong> si algo falla al sincronizar,
            Pulso lo mantiene en cola hasta que lo resuelvas (no se borra solo).
          </li>
          <li>
            <strong className="text-slate-300">iPhone:</strong> agrega a inicio → atajo “Nuevo
            gasto” o usa Registro rápido dentro de la app.
          </li>
        </ul>
      </section>
    </div>
  )
})
