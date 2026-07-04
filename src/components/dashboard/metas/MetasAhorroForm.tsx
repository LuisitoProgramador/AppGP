import { memo, type FormEventHandler } from 'react'
import {
  formWithKeyboardClassName,
  inputClassName,
  buttonPrimaryFlexClassName,
  buttonSecondaryFlexClassName,
} from '../../ui/formStyles'
import MontoInput from '../../ui/MontoInput'

type MetasAhorroFormProps = {
  metaNombre: string
  setMetaNombre: (value: string) => void
  metaObjetivo: string
  setMetaObjetivo: (value: string) => void
  guardandoMeta: boolean
  handleCrearMeta: FormEventHandler<HTMLFormElement>
  onCancel: () => void
  objetivoInputId: string
  nombrePlaceholder: string
  submitLabel: string
  className?: string
}

export default memo(function MetasAhorroForm({
  metaNombre,
  setMetaNombre,
  metaObjetivo,
  setMetaObjetivo,
  guardandoMeta,
  handleCrearMeta,
  onCancel,
  objetivoInputId,
  nombrePlaceholder,
  submitLabel,
  className = 'space-y-3',
}: MetasAhorroFormProps) {
  return (
    <form onSubmit={handleCrearMeta} className={`${className} ${formWithKeyboardClassName}`}>
      <input
        type="text"
        inputMode="text"
        value={metaNombre}
        onChange={(e) => setMetaNombre(e.target.value)}
        placeholder={nombrePlaceholder}
        className={inputClassName}
        maxLength={100}
        required
      />
      <MontoInput
        id={objetivoInputId}
        value={metaObjetivo}
        onChange={setMetaObjetivo}
        placeholder="Monto objetivo"
        required
      />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className={buttonSecondaryFlexClassName}>
          Cancelar
        </button>
        <button type="submit" disabled={guardandoMeta} className={buttonPrimaryFlexClassName}>
          {guardandoMeta ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  )
})
