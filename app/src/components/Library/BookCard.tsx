import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BookWithProgress } from '@/services/api/types'

interface BookCardProps {
  book: BookWithProgress
  coverUrl: string | null
  onEdit: () => void
  onDelete: () => void
}

export function BookCard({ book, coverUrl, onEdit, onDelete }: BookCardProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const progress = book.reading_progress
  const progressPercent = progress && book.num_pages
    ? Math.round((progress.last_page_read / book.num_pages) * 100)
    : 0

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="group relative flex flex-col">
      {/* Cover */}
      <button
        onClick={() => navigate(`/read/${book.id}`)}
        className="relative aspect-[2/3] w-full rounded-sm overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-200 bg-gray-200 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          /* Fallback: typography-based cover */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-800 dark:to-gray-900">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight line-clamp-4">
              {book.title}
            </span>
            {book.author && (
              <span className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center line-clamp-2">
                {book.author}
              </span>
            )}
          </div>
        )}

        {/* Progress strip at bottom of cover */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-white/90">{progressPercent}%</span>
            </div>
            <div className="h-0.5 bg-white/20 rounded-full">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </button>

      {/* Three-dot menu */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 py-1">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit() }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete() }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Title, author & progress below cover */}
      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={book.title}>
          {book.title}
        </p>
        {book.author && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={book.author}>
            {book.author}
          </p>
        )}
      </div>
    </div>
  )
}
