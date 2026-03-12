import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { parseFilename } from '@/utils/filenameParser'

interface UploadModalProps {
  isOpen: boolean
  file: File
  uploading: boolean
  progress: string
  onUpload: (file: File, metadata: { title: string; author: string | null }) => void
  onCancel: () => void
  onChangeFile: () => void
}

export function UploadModal({ isOpen, file, uploading, progress, onUpload, onCancel, onChangeFile }: UploadModalProps) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Parse metadata when file changes
  useEffect(() => {
    if (isOpen && file) {
      const parsed = parseFilename(file.name)
      setTitle(parsed.title)
      setAuthor(parsed.author ?? '')
    }
  }, [isOpen, file])

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isOpen, file])

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return
    onUpload(file, { title: title.trim(), author: author.trim() || null })
  }, [file, title, author, onUpload])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !uploading) {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && title.trim()) {
      e.preventDefault()
      handleSubmit()
    }
  }, [uploading, onCancel, title, handleSubmit])

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Upload book
          </h2>

          {/* File info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            {!uploading && (
              <button
                onClick={onChangeFile}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                Change
              </button>
            )}
          </div>

          {/* Large file warning */}
          {file.size > 20 * 1024 * 1024 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4 text-amber-700 dark:text-amber-400 text-xs">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.345 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>Large file ({(file.size / 1024 / 1024).toFixed(0)} MB) — upload may take a while depending on your connection.</span>
            </div>
          )}

          {/* Title & Author fields */}
          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Book title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                disabled={uploading}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Author (optional)"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              disabled={uploading}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {uploading ? progress || 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
