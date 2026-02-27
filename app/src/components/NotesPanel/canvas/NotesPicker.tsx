import { useEffect, useState, useRef } from 'react'
import type { Annotation } from '@/types'

const MAX_NOTES = 5

interface NotesPickerProps {
  annotations: Annotation[]
  onSelect: (annotation: Annotation) => void
  onClose: () => void
  position?: { top: number; left: number } | null
}

export function NotesPicker({ annotations, onSelect, onClose, position }: NotesPickerProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Filter and limit items
  const filteredItems = annotations
    .filter((item) => {
      if (!query) return true
      const q = query.toLowerCase()
      if (item.type === 'highlight') return item.text.toLowerCase().includes(q)
      if (item.type === 'note') return item.content.toLowerCase().includes(q)
      if (item.type === 'bookmark')
        return (item.pageText || `Page ${item.pageNumber}`).toLowerCase().includes(q)
      return false
    })
    .slice(0, MAX_NOTES)

  // Auto-focus the input after a short delay (let the suggestion popup fully close)
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Click-outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Keyboard navigation on the input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(filteredItems.length - 1, 0) : prev - 1
      )
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev >= filteredItems.length - 1 ? 0 : prev + 1
      )
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredItems[selectedIndex]
      if (item) onSelect(item)
      return
    }
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'highlight':
        return (
          <svg className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        )
      case 'note':
        return (
          <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'bookmark':
        return (
          <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getItemText = (item: Annotation): string => {
    if (item.type === 'highlight') return item.text
    if (item.type === 'note') return item.content
    if (item.type === 'bookmark') return item.pageText || 'Bookmark'
    return ''
  }

  const getItemPage = (item: Annotation): number => {
    if (item.type === 'highlight') return item.pageNumber
    if (item.type === 'note') return item.pageNumber ?? 0
    if (item.type === 'bookmark') return item.pageNumber
    return 0
  }

  const panelStyle: React.CSSProperties = position
    ? { top: position.top, left: Math.max(0, position.left), maxWidth: 'calc(100% - 1rem)' }
    : { bottom: '1rem', left: '1rem', right: '1rem' }

  return (
    <div
      ref={panelRef}
      className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden w-72"
      style={panelStyle}
    >
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Import Note
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search notes..."
          className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div ref={listRef} className="max-h-60 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">
            No notes found
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={`w-full text-left px-3 py-2 flex items-start gap-2 text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {getItemIcon(item.type)}
              <div className="min-w-0 flex-1">
                <p className="text-gray-900 dark:text-gray-200 truncate">
                  {getItemText(item).slice(0, 80)}
                  {getItemText(item).length > 80 ? '...' : ''}
                </p>
                {getItemPage(item) > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Page {getItemPage(item)}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
