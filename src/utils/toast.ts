import { toast } from 'sonner'

const UNDO_TOAST_DURATION_MS = 10_000

export function showSuccess(message: string) {
  toast.success(message)
}

export function showSuccessWithUndo(
  message: string,
  onUndo: () => void | Promise<void>,
) {
  toast.success(message, {
    duration: UNDO_TOAST_DURATION_MS,
    action: {
      label: 'Deshacer',
      onClick: () => {
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
