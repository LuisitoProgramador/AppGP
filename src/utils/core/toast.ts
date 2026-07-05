import { toast } from 'sonner'
import { hapticLight, hapticSuccess } from './haptics'

const UNDO_TOAST_DURATION_MS = 10_000

export function showSuccess(message: string) {
  hapticSuccess()
  toast.success(message)
}

export function showSuccessWithUndo(
  message: string,
  onUndo: () => void | Promise<void>,
) {
  hapticSuccess()
  toast.success(message, {
    duration: UNDO_TOAST_DURATION_MS,
    action: {
      label: 'Deshacer',
      onClick: () => {
        hapticLight()
        void onUndo()
      },
    },
  })
}

export function showError(message: string) {
  toast.error(message)
}

export function showInfo(message: string) {
  toast.info(message)
}

export function showWarning(message: string) {
  toast.warning(message)
}
