import { memo } from 'react'
import { useGastoForm } from '../hooks/forms/useGastoForm'
import GastoFormFields from './gasto/GastoFormFields'
import { cardClassName, registroFormClassName } from './ui/formStyles'

export default memo(function GastoForm() {
  const gastoForm = useGastoForm()

  return (
    <form
      onSubmit={gastoForm.handleSubmit}
      className={`${cardClassName} ${registroFormClassName}`}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Nuevo gasto</h2>
        <p className="text-sm text-slate-400">Monto, tarjeta y categoría. Tú eliges todo.</p>
      </div>

      <GastoFormFields {...gastoForm} />
    </form>
  )
})
