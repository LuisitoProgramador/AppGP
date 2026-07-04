/** Transición y feedback táctil estándar para controles interactivos */
const interactive =
  'touch-manipulation transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100'

export const inputClassName =
  'w-full rounded-xl border border-slate-600/80 bg-slate-900/70 px-4 py-3.5 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/30'

/** Tarjeta base con glassmorphism sutil */
export const cardClassName =
  'space-y-6 rounded-2xl border border-white/10 bg-slate-800/45 p-6 shadow-xl shadow-black/25 backdrop-blur-md'

/** Contenedor premium del Dashboard at-a-glance */
export const dashboardShellClassName =
  'space-y-6 rounded-2xl border border-white/10 bg-slate-800/40 p-6 shadow-xl shadow-black/20 backdrop-blur-md'

/** Tarjetas internas del Dashboard (widgets) */
export const dashboardCardClassName =
  'rounded-2xl border border-white/10 bg-slate-900/35 p-5 shadow-md shadow-black/15 backdrop-blur-sm'

/** Panel de Ajustes con más aire entre secciones */
export const settingsPanelClassName = 'space-y-8'

/** Separador entre secciones de Ajustes */
export const settingsDividerClassName = 'border-t border-white/10 pt-8'

/** Espacio inferior en móvil para que el teclado no tape campos ni el botón de envío */
export const formWithKeyboardClassName = 'scroll-pb-32 max-sm:pb-32'

/** Formulario de registro centrado y con ancho cómodo */
export const registroFormClassName = 'mx-auto w-full max-w-md'

/** Contenedor de pestaña con transición suave */
export const tabPanelClassName = 'space-y-6 transition-opacity duration-200'

/** Contenedor pegajoso para el botón de envío en formularios móviles */
export const formSubmitStickyClassName =
  'sticky bottom-0 z-10 -mx-6 mt-2 border-t border-white/10 bg-slate-800/90 px-6 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none'

/** Panel de formulario dentro de ModalPortal */
export const modalFormClassName =
  'w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-slate-800/90 p-6 shadow-2xl backdrop-blur-md'

/** Botón de icono con área táctil mínima de 44×44 px */
export const iconButtonClassName = `inline-flex shrink-0 items-center justify-center min-h-11 min-w-11 rounded-lg p-3 ${interactive}`

export const iconButtonEditClassName = `${iconButtonClassName} text-slate-400 hover:bg-blue-500/10 hover:text-blue-400 active:bg-blue-500/20`

export const iconButtonDangerClassName = `${iconButtonClassName} text-slate-400 hover:bg-red-500/10 hover:text-red-400 active:bg-red-500/20`

export const iconButtonMsiClassName = `${iconButtonClassName} text-xs font-semibold text-violet-300 hover:bg-violet-500/15 active:bg-violet-500/25`

export const buttonPrimaryClassName = `w-full rounded-xl bg-blue-500 px-4 py-3.5 text-base font-semibold text-white hover:bg-blue-400 active:bg-blue-600 ${interactive}`

export const buttonPrimaryFlexClassName = `flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-400 active:bg-blue-600 ${interactive}`

export const buttonPrimaryCompactClassName = `shrink-0 min-h-11 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 active:bg-blue-600 ${interactive}`

export const buttonSecondaryClassName = `rounded-xl bg-slate-700/90 px-4 py-3 text-base font-medium text-white hover:bg-slate-600 active:bg-slate-800 ${interactive}`

export const buttonSecondaryFlexClassName = `flex-1 ${buttonSecondaryClassName}`

export const buttonGhostClassName = `rounded-xl border border-slate-600/80 px-4 py-3 text-base font-medium text-slate-300 hover:border-slate-500 hover:bg-slate-700/40 hover:text-white active:bg-slate-700 ${interactive}`

export const buttonGhostFlexClassName = `flex-1 ${buttonGhostClassName}`

export const buttonGhostSmClassName = `rounded-xl border border-slate-600/80 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700/60 hover:text-white active:bg-slate-700 ${interactive}`

export const buttonGhostSmFlexClassName = `flex-1 ${buttonGhostSmClassName}`

export const buttonEmeraldClassName = `rounded-xl bg-emerald-500 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-400 active:bg-emerald-600 ${interactive}`

export const buttonEmeraldFlexClassName = `flex-1 ${buttonEmeraldClassName}`

export const buttonEmeraldFullClassName = `w-full ${buttonEmeraldClassName}`

export const buttonVioletClassName = `w-full rounded-xl bg-violet-500 px-4 py-3 text-base font-semibold text-white hover:bg-violet-400 active:bg-violet-600 ${interactive}`

export const buttonVioletFlexClassName = `flex-1 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 active:bg-violet-600 ${interactive}`

export const buttonSkyClassName = `rounded-xl bg-sky-500 px-4 py-3 text-xs font-semibold text-white hover:bg-sky-400 active:bg-sky-600 min-h-11 ${interactive}`

export const chipButtonClassName = `rounded-full border border-slate-600/80 bg-slate-900/50 px-4 py-2.5 text-sm font-medium text-slate-200 min-h-11 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-white active:bg-slate-700 ${interactive}`

export const togglePillClassName = `rounded-full border px-4 py-2.5 text-xs font-medium min-h-11 ${interactive}`

export const navTabClassName = (active: boolean) =>
  `w-full rounded-lg px-2 py-2.5 text-xs font-semibold min-h-11 sm:px-3 sm:text-sm ${interactive} ${
    active
      ? 'bg-blue-500 text-white shadow-sm active:bg-blue-600'
      : 'text-slate-400 hover:text-white active:bg-slate-700'
  }`

export const chartToggleClassName = (active: boolean) =>
  `flex-1 rounded-md px-3 py-2.5 text-xs font-semibold min-h-11 ${interactive} ${
    active
      ? 'bg-slate-700 text-white active:bg-slate-800'
      : 'text-slate-400 hover:text-white active:bg-slate-700'
  }`

export const textLinkClassName = 'w-full text-sm text-slate-400 transition hover:text-white'

export const signOutButtonClassName = `shrink-0 rounded-lg px-4 py-2.5 text-sm text-slate-400 min-h-11 ${interactive} active:bg-slate-700 hover:bg-slate-800 hover:text-white`
