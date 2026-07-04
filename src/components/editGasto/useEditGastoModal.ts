import { useCuentas } from '../../contexts'
import type { EditGastoModalProps } from './types'
import { useEditGastoForm } from './useEditGastoForm'
import { useEditGastoSubmit } from './useEditGastoSubmit'

export function useEditGastoModal({ gasto, onClose, modoInicial = 'cuota' }: EditGastoModalProps) {
  const { cuentas, cuentasLoading } = useCuentas()
  const form = useEditGastoForm({ gasto, modoInicial })
  const { guardando, handleSubmit } = useEditGastoSubmit({ gasto, onClose }, form)

  return {
    cuentas,
    cuentasLoading,
    ...form,
    guardando,
    handleSubmit,
  }
}
