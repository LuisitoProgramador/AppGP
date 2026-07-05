interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-800/80 ${className}`.trim()}
      aria-hidden="true"
    />
  )
}

export function CuentaCardSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  )
}

export function CuentasListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Cargando cuentas">
      {Array.from({ length: count }, (_, index) => (
        <CuentaCardSkeleton key={index} />
      ))}
    </div>
  )
}
