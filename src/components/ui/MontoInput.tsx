import { forwardRef, memo, type KeyboardEvent } from 'react'
import { formatMontoInput } from '../../utils/format/montoInput'
import { inputClassName, iosFinancialInputProps } from './formStyles'

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
  'data-testid'?: string
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
    'data-testid': testId,
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
      {...iosFinancialInputProps}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(formatMontoInput(e.target.value))}
      onKeyDown={onKeyDown}
      className={className}
      autoFocus={autoFocus}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
      data-testid={testId}
    />
  )
})

export default memo(MontoInput)
