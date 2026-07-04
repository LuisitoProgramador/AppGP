export interface GastoFijoDraft {
  id: string
  descripcion: string
  monto: string
  cuenta_id: string
}

export interface TarjetaDraft {
  id: string
  nombre: string
  limite_credito: string
  dia_corte: string
  saldo_actual: string
}

export interface CuentaLiquidaDraft {
  id: string
  nombre: string
  saldo_actual: string
}

export interface CuentaOption {
  id: string
  label: string
}

export interface OnboardingFlowProps {
  onComplete: () => void
}
