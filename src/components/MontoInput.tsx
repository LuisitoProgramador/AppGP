import { forwardRef, memo } from 'react'
import { formatMontoInput } from '../utils/montoInput'
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
      className={className}
      autoFocus={autoFocus}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  )
})

export default memo(MontoInput)
