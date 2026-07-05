/** Patrones cortos de vibración para confirmar acciones en móvil. */
const SUCCESS_PATTERN = [12, 40, 12] as const
const UNDO_PATTERN = [8] as const

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function hapticSuccess() {
  if (!canVibrate()) return
  navigator.vibrate([...SUCCESS_PATTERN])
}

export function hapticLight() {
  if (!canVibrate()) return
  navigator.vibrate([...UNDO_PATTERN])
}
