import { useState, useEffect, useRef } from 'react'

interface FreeFormNoteModalProps {
  isOpen: boolean
  onSave: (content: string, pageNumber?: number) => void
  onCancel: () => void
  initialContent?: string
  initialPageNumber?: number
  currentPage?: number
}

export function FreeFormNoteModal({
  isOpen,
  onSave,
  onCancel,
  initialContent = '',
  initialPageNumber,
  currentPage,
}: FreeFormNoteModalProps) {
  const [content, setContent] = useState('')
  const [pageNumber, setPageNumber] = useState<string>('')
  const contentInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent)
      setPageNumber(initialPageNumber?.toString() || '')
      // Focus input after a brief delay to ensure modal is rendered
      setTimeout(() => {
        contentInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, initialContent, initialPageNumber])

  const handleSave = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      return
    }
    const pageNum = pageNumber.trim() ? parseInt(pageNumber.trim(), 10) : undefined
    onSave(trimmedContent, pageNum)
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
    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-50 flex items-center justify-center bg-black/50" style={{ minHeight: '100vh' }} onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Free Form Note</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Create a free form note. Optionally link it to a specific page.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note Content
              </label>
              <textarea
                ref={contentInputRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your note here..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Page Number (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder={currentPage ? `Current: ${currentPage}` : 'Page number'}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
                {currentPage && (
                  <button
                    type="button"
                    onClick={() => setPageNumber(currentPage.toString())}
                    className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
                  >
                    Use Current
                  </button>
                )}
              </div>
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
              disabled={!content.trim()}
              className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
