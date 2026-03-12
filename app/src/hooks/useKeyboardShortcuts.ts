import { useEffect, useCallback } from 'react'

export type TabKey = 'chat' | 'notes' | 'canvas'

interface KeyboardShortcutsOptions {
  onNextPage?: () => void
  onPreviousPage?: () => void
  onCloseSelection?: () => void
  onTogglePanel?: () => void
  onNavigateToTab?: (tab: TabKey) => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onNextPage,
  onPreviousPage,
  onCloseSelection,
  onTogglePanel,
  onNavigateToTab,
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

      // C/N/V: navigate to Chat, Notes, Canvas (only when focus is not in an editable field)
      if (onNavigateToTab && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'c') {
          e.preventDefault()
          onNavigateToTab('chat')
        } else if (e.key === 'n') {
          e.preventDefault()
          onNavigateToTab('notes')
        } else if (e.key === 'v') {
          e.preventDefault()
          onNavigateToTab('canvas')
        }
      }
    },
    [enabled, onNextPage, onPreviousPage, onCloseSelection, onTogglePanel, onNavigateToTab]
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
