import { useState, useEffect, useRef } from 'react'

interface DocumentMetadataModalProps {
  isOpen: boolean
  initialTitle: string
  initialAuthor: string | null
  onSave: (title: string, author: string | null) => void
  onSkip: () => void
}

export function DocumentMetadataModal({
  isOpen,
  initialTitle,
  initialAuthor,
  onSave,
  onSkip,
}: DocumentMetadataModalProps) {
  const [title, setTitle] = useState(initialTitle)
  const [author, setAuthor] = useState(initialAuthor || '')
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle)
      setAuthor(initialAuthor || '')
      // Focus title input after a brief delay to ensure modal is rendered
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, initialTitle, initialAuthor])

  const handleSave = () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      return
    }
    onSave(trimmedTitle, author.trim() || null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onSkip()
    }
  }

  if (!isOpen) return null

  const previewText = author
    ? `[Document: "${title}" by ${author}, Page X of Y]`
    : `[Document: "${title}", Page X of Y]`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onSkip}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Document Information</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Help the assistant understand what you're reading. This information will be included in your conversations.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Book or document title"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name (optional)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSave()
                  }
                }}
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preview:</div>
              <div className="text-sm text-gray-700 dark:text-gray-300 font-mono">{previewText}</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Skip
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Save
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100">Ctrl+Enter</kbd> to save, <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100">Esc</kbd> to skip
          </div>
        </div>
      </div>
    </div>
  )
}
