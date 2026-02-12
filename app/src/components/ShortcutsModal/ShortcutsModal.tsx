import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUT_ROW_CLASS = 'flex items-center justify-between gap-4 py-2 text-sm text-gray-700 dark:text-gray-300'
const KBD_CLASS = 'px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono text-xs'

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header - matches app, dark mode friendly */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Shortcuts</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
            title="Close"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[70vh] overflow-auto">
          <section className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Sidebar
            </h3>
            <dl className="space-y-0">
              <div className={SHORTCUT_ROW_CLASS}>
                <dt>Expand / collapse Chat</dt>
                <dd><kbd className={KBD_CLASS}>C</kbd></dd>
              </div>
              <div className={SHORTCUT_ROW_CLASS}>
                <dt>Expand / collapse Notes</dt>
                <dd><kbd className={KBD_CLASS}>N</kbd></dd>
              </div>
              <div className={SHORTCUT_ROW_CLASS}>
                <dt>Expand / collapse Settings</dt>
                <dd><kbd className={KBD_CLASS}>S</kbd></dd>
              </div>
              <div className={SHORTCUT_ROW_CLASS}>
                <dt>Expand / collapse Panel</dt>
                <dd><kbd className={KBD_CLASS}>P</kbd></dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Reading
            </h3>
            <dl className="space-y-0">
              <div className={SHORTCUT_ROW_CLASS}>
                <dt>Previous page</dt>
                <dd><kbd className={KBD_CLASS}>←</kbd></dd>
              </div>
              <div className={SHORTCUT_ROW_CLASS}>
                <dt>Next page</dt>
                <dd><kbd className={KBD_CLASS}>→</kbd></dd>
              </div>
              <div className={SHORTCUT_ROW_CLASS}>
                <dt>Close selection</dt>
                <dd><kbd className={KBD_CLASS}>Esc</kbd></dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
