import { useState, useEffect, useRef } from 'react'

interface EditBookModalProps {
  isOpen: boolean
  title: string
  author: string | null
  onSave: (metadata: { title: string; author: string | null }) => void
  onCancel: () => void
}

export function EditBookModal({ isOpen, title, author, onSave, onCancel }: EditBookModalProps) {
  const [editTitle, setEditTitle] = useState(title)
  const [editAuthor, setEditAuthor] = useState(author || '')
  const [error, setError] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setEditTitle(title)
      setEditAuthor(author || '')
      setError(null)
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen, title, author])

  const handleSave = () => {
    const trimmedTitle = editTitle.trim()
    const trimmedAuthor = editAuthor.trim()
    if (!trimmedTitle) {
      setError('Title is required')
      return
    }
    if (!trimmedAuthor) {
      setError('Author is required')
      return
    }
    onSave({ title: trimmedTitle, author: trimmedAuthor })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onKeyDown={handleKeyDown}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Book</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => { setEditTitle(e.target.value); setError(null) }}
                placeholder="Book title"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Author <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editAuthor}
                onChange={(e) => { setEditAuthor(e.target.value); setError(null) }}
                placeholder="Author name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!editTitle.trim() || !editAuthor.trim()}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
