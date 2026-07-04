import { TOTAL_STEPS } from './constants'

interface StepIndicatorProps {
  step: number
}

export default function StepIndicator({ step }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i + 1 === step
              ? 'w-8 bg-pulso-accent'
              : i + 1 < step
                ? 'w-4 bg-pulso-accent/60'
                : 'w-4 bg-slate-700'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
