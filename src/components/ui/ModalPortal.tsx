import { memo, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { lockBodyScroll } from '../../utils/core/scrollLock'

const MODAL_ROOT_ID = 'modal-root'

function getModalRoot(): HTMLElement {
  return document.getElementById(MODAL_ROOT_ID) ?? document.body
}

interface ModalPortalProps {
  onClose: () => void
  children: ReactNode
  ariaLabelledBy?: string
}

function ModalPortal({ onClose, children, ariaLabelledBy }: ModalPortalProps) {
  useEffect(() => {
    const unlockScroll = lockBodyScroll()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      unlockScroll()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>,
    getModalRoot(),
  )
}

export default memo(ModalPortal)
