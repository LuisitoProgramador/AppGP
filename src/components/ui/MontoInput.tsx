import { forwardRef, memo, type KeyboardEvent } from 'react'
import { formatMontoInput } from '../../utils/format/montoInput'
import { inputClassName } from './formStyles'

interface MontoInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  required?: boolean
  disabled?: boolean
  'aria-label'?: string
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}

const MontoInput = forwardRef<HTMLInputElement, MontoInputProps>(function MontoInput(
  {
    id,
    value,
    onChange,
    placeholder = '0',
    className = inputClassName,
    autoFocus,
    required,
    disabled,
    'aria-label': ariaLabel,
    onKeyDown,
  },
  ref,
) {
  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(formatMontoInput(e.target.value))}
      onKeyDown={onKeyDown}
      className={className}
      autoFocus={autoFocus}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  )
})

export default memo(MontoInput)
