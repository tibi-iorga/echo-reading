import { useState, useEffect, useRef } from 'react'

interface HighlightNoteModalProps {
  isOpen: boolean
  onSave: (note: string | undefined) => void
  onCancel: () => void
}

export function HighlightNoteModal({
  isOpen,
  onSave,
  onCancel,
}: HighlightNoteModalProps) {
  const [note, setNote] = useState('')
  const noteInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setNote('')
      // Focus input after a brief delay to ensure modal is rendered
      setTimeout(() => {
        noteInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSave = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const trimmedNote = note.trim()
    onSave(trimmedNote || undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Add a note</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Add an optional note to this highlight. Leave blank to create a highlight without a note.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note (optional)
              </label>
              <textarea
                ref={noteInputRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter your note here..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCancel()
              }}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 text-sm"
            >
              Save Highlight
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100">Ctrl+Enter</kbd> to save, <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100">Esc</kbd> to cancel
          </div>
        </div>
      </div>
    </div>
  )
}
