/** Transición y feedback táctil estándar para controles interactivos */
const interactive =
  'touch-manipulation transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100'

const accentFocus =
  'focus:border-pulso-accent/80 focus:ring-2 focus:ring-pulso-accent/30'

export const inputClassName = `w-full rounded-xl border border-pulso-border bg-pulso-surface-muted/90 px-4 py-3.5 text-base text-white placeholder:text-slate-500 outline-none transition ${accentFocus}`

/** Input dentro de una fila flex (sin ancho completo) */
export const inputInlineClassName = `min-w-0 flex-1 rounded-xl border border-pulso-border bg-pulso-surface-muted/90 px-4 py-3.5 text-base text-white placeholder:text-slate-500 outline-none transition ${accentFocus}`

/** Tarjeta base con glassmorphism sutil */
export const cardClassName =
  'select-none space-y-4 rounded-2xl border border-white/8 bg-pulso-surface/90 p-4 shadow-xl shadow-black/30 backdrop-blur-md sm:p-5'

/** Contenedor premium del Dashboard at-a-glance */
export const dashboardShellClassName =
  'select-none space-y-4 rounded-2xl border border-white/8 bg-pulso-surface/80 p-4 shadow-xl shadow-black/25 backdrop-blur-md sm:p-5'

/** Tarjetas internas del Dashboard (widgets) */
export const dashboardCardClassName =
  'select-none rounded-2xl border border-white/8 bg-pulso-surface-muted/80 p-4 shadow-md shadow-black/20 backdrop-blur-sm'

/** Tarjeta compacta de cuenta (lista / transferencias) */
export const cuentaCardClassName =
  'rounded-xl border border-white/8 bg-pulso-surface-muted/50 px-3 py-2.5'

/** Panel de Ajustes con más aire entre secciones */
export const settingsPanelClassName = 'space-y-8'

/** Separador entre secciones de Ajustes */
export const settingsDividerClassName = 'border-t border-white/8 pt-8'

/** Espacio extra al final de formularios en móvil */
export const formWithKeyboardClassName = 'pb-2'

/** Formulario dentro de modal — compacto, sin padding extra inferior */
export const modalFormClassName =
  'w-full max-w-md space-y-4 rounded-2xl border border-white/8 bg-pulso-surface-raised/95 p-4 shadow-2xl backdrop-blur-md'

/** Formulario de registro centrado y con ancho cómodo */
export const registroFormClassName = 'mx-auto w-full max-w-md'

/** Contenedor de pestaña con transición suave */
export const tabPanelClassName = 'space-y-4 transition-opacity duration-200'

/** Botón de envío al final del formulario (flujo normal, sin sticky) */
export const formSubmitClassName = 'mt-4 border-t border-white/8 pt-4 pb-1'

/** Panel de formulario dentro de ModalPortal */
export const modalPanelClassName = modalFormClassName

/** Botón de icono con área táctil mínima de 44×44 px */
export const iconButtonClassName = `inline-flex shrink-0 items-center justify-center min-h-11 min-w-11 rounded-lg p-3 ${interactive}`

export const iconButtonEditClassName = `${iconButtonClassName} text-slate-400 active:bg-pulso-accent/20 active:text-pulso-accent-muted`

export const iconButtonDangerClassName = `${iconButtonClassName} text-slate-400 active:bg-pulso-danger/10 active:text-pulso-danger`

export const iconButtonMsiClassName = `${iconButtonClassName} text-xs font-semibold text-pulso-accent-muted active:bg-pulso-accent/25`

export const buttonPrimaryClassName = `w-full rounded-xl bg-pulso-accent px-4 py-3.5 text-base font-semibold text-neutral-950 active:bg-pulso-accent-active ${interactive}`

export const buttonPrimaryFlexClassName = `flex-1 rounded-xl bg-pulso-accent px-4 py-3 text-sm font-semibold text-neutral-950 active:bg-pulso-accent-active ${interactive}`

export const buttonPrimaryCompactClassName = `shrink-0 min-h-11 rounded-xl bg-pulso-accent px-4 py-2.5 text-sm font-semibold text-neutral-950 active:bg-pulso-accent-active ${interactive}`

export const buttonSecondaryClassName = `rounded-xl bg-pulso-surface-raised px-4 py-3 text-base font-medium text-white active:bg-pulso-surface ${interactive}`

export const buttonSecondaryFlexClassName = `flex-1 ${buttonSecondaryClassName}`

export const buttonGhostClassName = `rounded-xl border border-pulso-border px-4 py-3 text-base font-medium text-slate-300 active:border-pulso-accent/40 active:bg-pulso-surface-raised active:text-white ${interactive}`

export const buttonGhostFlexClassName = `flex-1 ${buttonGhostClassName}`

export const buttonGhostSmClassName = `rounded-xl border border-pulso-border px-4 py-2.5 text-sm font-semibold text-slate-300 active:bg-pulso-accent/10 active:text-white active:bg-pulso-surface-raised ${interactive}`

export const buttonGhostSmFlexClassName = `flex-1 ${buttonGhostSmClassName}`

/** Acento secundario — misma paleta monocromática */
export const buttonPrimaryFullClassName = `w-full ${buttonPrimaryClassName}`

export const buttonSkyClassName = `rounded-xl border border-pulso-border bg-pulso-surface-raised px-4 py-3 text-xs font-semibold text-pulso-accent-muted active:border-pulso-accent/40 active:bg-pulso-accent/10 min-h-11 ${interactive}`

export const toolbarButtonClassName = `inline-flex shrink-0 items-center justify-center gap-1.5 min-h-11 rounded-xl border border-pulso-border px-3 py-2.5 text-sm font-semibold text-slate-300 active:border-pulso-accent/40 active:bg-pulso-accent/10 active:text-white active:bg-pulso-surface-raised disabled:cursor-not-allowed disabled:opacity-50 ${interactive}`

export const togglePillClassName = `rounded-full border px-4 py-2.5 text-xs font-medium min-h-11 ${interactive}`

export const navTabClassName = (active: boolean) =>
  `w-full rounded-lg px-2 py-2.5 text-xs font-semibold min-h-11 whitespace-nowrap sm:px-3 sm:text-sm ${interactive} ${
    active
      ? 'bg-pulso-accent text-neutral-950 shadow-sm active:bg-pulso-accent-active'
      : 'text-slate-400 active:text-white active:bg-pulso-surface-raised'
  }`

/** Chip seleccionable (cuenta, categoría, etc.) */
export const chipPickerClassName = (active: boolean) =>
  `rounded-full border px-3.5 py-2 text-sm font-medium min-h-11 touch-manipulation transition active:scale-[0.98] ${
    active
      ? 'border-pulso-accent bg-pulso-accent/15 text-white shadow-sm'
      : 'border-pulso-border bg-pulso-surface-muted/80 text-slate-300 active:bg-pulso-surface-raised'
  }`

export const navBottomTabClassName = (active: boolean) =>
  `flex w-full flex-col items-center justify-center rounded-lg px-2 py-2 min-h-11 ${interactive} ${
    active
      ? 'text-pulso-accent'
      : 'text-slate-500 active:bg-pulso-surface-raised'
  }`

export const chartToggleClassName = (active: boolean) =>
  `flex-1 rounded-md px-2 py-2.5 text-[11px] font-semibold min-h-11 whitespace-nowrap sm:px-3 sm:text-xs ${interactive} ${
    active
      ? 'bg-pulso-surface-raised text-white active:bg-pulso-surface'
      : 'text-slate-400 active:text-white active:bg-pulso-surface-raised'
  }`

export const textLinkClassName = 'w-full text-sm text-slate-400 transition active:text-white'

export const signOutButtonClassName = `shrink-0 rounded-lg px-4 py-2.5 text-sm text-slate-400 min-h-11 ${interactive} active:bg-pulso-surface-raised active:text-white`

/** Tarjeta / banner con acento positivo (presupuesto ok, metas, etc.) */
export const accentPositivePanelClassName =
  'rounded-xl border border-pulso-accent/30 bg-pulso-accent/10'

/** Tarjeta / banner de advertencia (solo exceso de presupuesto y alertas) */
export const accentWarningPanelClassName =
  'rounded-xl border border-pulso-warning/40 bg-pulso-warning/15'

/** Tarjeta / banner de error o presupuesto superado */
export const accentDangerPanelClassName =
  'rounded-xl border border-pulso-danger/40 bg-pulso-danger/15'
