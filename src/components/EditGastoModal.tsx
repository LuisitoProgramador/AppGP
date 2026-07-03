import { type FormEvent, useEffect, useState } from 'react'
import { useGastosRefresh } from '../contexts'
import { supabase } from '../services/supabase'
import { CATEGORIAS, type Gasto } from '../types/gasto'
import { showError, showSuccess } from '../utils/toast'
import { validateDescripcion, validateMonto } from '../utils/validation'
import ModalPortal from './ModalPortal'
import { cardClassName, inputClassName } from './formStyles'

interface EditGastoModalProps {
  gasto: Gasto
  onClose: () => void
}

export default function EditGastoModal({ gasto, onClose }: EditGastoModalProps) {
  const { refresh } = useGastosRefresh()
  const [monto, setMonto] = useState(String(gasto.monto))
  const [categoria, setCategoria] = useState(gasto.categoria)
  const [descripcion, setDescripcion] = useState(gasto.descripcion ?? '')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const montoError = validateMonto(monto)
    if (montoError) {
      showError(montoError)
      return
    }

    const descripcionError = validateDescripcion(descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return
    }

    setGuardando(true)

    const { error } = await supabase
      .from('gastos')
      .update({
        monto: Number(monto),
        categoria,
        descripcion: descripcion.trim(),
      })
      .eq('id', gasto.id)

    setGuardando(false)

    if (error) {
      showError(`Error al actualizar: ${error.message}`)
      return
    }

    refresh()
    showSuccess('Gasto actualizado correctamente.')
    onClose()
  }

  return (
    <ModalPortal onClose={onClose} ariaLabelledBy="edit-gasto-title">
      <form
        onSubmit={handleSubmit}
        className={`${cardClassName} max-h-[90svh] w-full max-w-lg overflow-y-auto`}
      >
        <div className="space-y-1">
          <h2 id="edit-gasto-title" className="text-lg font-semibold text-white">
            Editar gasto
          </h2>
          <p className="text-sm text-slate-400">Corrige los datos del movimiento</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-monto" className="block text-sm font-medium text-slate-300">
            Monto
          </label>
          <input
            id="edit-monto"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={inputClassName}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-categoria" className="block text-sm font-medium text-slate-300">
            Categoría
          </label>
          <select
            id="edit-categoria"
            value={categoria}
            onChange={(e) =>
              setCategoria(e.target.value as (typeof CATEGORIAS)[number])
            }
            className={inputClassName}
            required
          >
            {CATEGORIAS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-descripcion" className="block text-sm font-medium text-slate-300">
            Descripción
          </label>
          <input
            id="edit-descripcion"
            type="text"
            maxLength={200}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={inputClassName}
            required
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </ModalPortal>
  )
}
