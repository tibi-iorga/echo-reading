import { useEffect, useCallback } from 'react'

interface KeyboardShortcutsOptions {
  onNextPage?: () => void
  onPreviousPage?: () => void
  onCloseSelection?: () => void
  onTogglePanel?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onNextPage,
  onPreviousPage,
  onCloseSelection,
  onTogglePanel,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when user is typing in input fields
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Arrow keys for page navigation
      if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        onNextPage?.()
      }

      if (e.key === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        onPreviousPage?.()
      }

      // Escape to close selection
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseSelection?.()
      }

      // Toggle panel with 'p' key
      if (e.key === 'p' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        onTogglePanel?.()
      }
    },
    [enabled, onNextPage, onPreviousPage, onCloseSelection, onTogglePanel]
  )

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [enabled, handleKeyDown])
}
