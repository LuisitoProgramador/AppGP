import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  onClose: () => void
  children: ReactNode
  ariaLabelledBy?: string
}

export default function ModalPortal({
  onClose,
  children,
  ariaLabelledBy,
}: ModalPortalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow || 'unset'
    }
  }, [])

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
    document.body,
  )
}
