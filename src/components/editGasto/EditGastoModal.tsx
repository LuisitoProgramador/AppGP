import ModalPortal from '../ui/ModalPortal'
import {
  buttonPrimaryClassName,
  buttonSecondaryFlexClassName,
  modalFormClassName,
} from '../ui/formStyles'
import EditGastoFormBody from './EditGastoFormBody'
import type { EditGastoModalProps } from './types'
import { useEditGastoModal } from './useEditGastoModal'

export type { EditGastoModo } from './types'

export default function EditGastoModal({ gasto, onClose, modoInicial }: EditGastoModalProps) {
  const modal = useEditGastoModal({ gasto, onClose, modoInicial })
  const { esMsi, corregirTotal, guardando, cargandoGrupo, edicionBloqueada, cuentaCambio, handleSubmit } =
    modal

  return (
    <ModalPortal onClose={onClose} ariaLabelledBy="edit-gasto-title">
      <form
        onSubmit={handleSubmit}
        className={`${modalFormClassName} max-h-[90svh] overflow-y-auto`}
      >
        <div className="space-y-1">
          <h2 id="edit-gasto-title" className="text-lg font-semibold text-white">
            {corregirTotal && esMsi ? 'Editar compra MSI' : 'Editar gasto'}
          </h2>
          <p className="text-sm text-slate-400">
            {corregirTotal && esMsi
              ? 'Corrige el total, los meses y la redistribución de cuotas'
              : 'Corrige los datos del movimiento'}
          </p>
        </div>

        <EditGastoFormBody {...modal} esMsi={esMsi} gastoPasado={modal.gastoPasado} />

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={buttonSecondaryFlexClassName}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              guardando || (esMsi && cargandoGrupo) || (edicionBloqueada && !cuentaCambio)
            }
            className={`flex-1 ${buttonPrimaryClassName}`}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </ModalPortal>
  )
}
