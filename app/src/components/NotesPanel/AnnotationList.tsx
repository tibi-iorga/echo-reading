import { useState, useRef, useEffect, useCallback } from 'react'
import type { Annotation } from '@/types'

interface AnnotationListProps {
  annotations: Annotation[]
  filterType?: 'all' | 'highlight' | 'note' | 'bookmark' | 'saved-from-chat'
  onRemove: (id: string) => void
  onNavigateToPage?: (pageNumber: number) => void
  onUpdateHighlightNote?: (id: string, note: string) => void
  onEditNote?: (id: string, content: string, pageNumber?: number) => void
}

interface OverflowMenuProps {
  annotationId: string
  isOpen: boolean
  onToggle: (id: string) => void
  items: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[]
}

function OverflowMenu({ annotationId, isOpen, onToggle, items }: OverflowMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onToggle(annotationId)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, annotationId, onToggle])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(annotationId) }}
        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="More options"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="16" cy="10" r="1.5" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 py-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={(e) => { e.stopPropagation(); item.onClick(); onToggle(annotationId) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                item.variant === 'danger'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AnnotationList({ annotations, filterType = 'all', onRemove, onNavigateToPage, onUpdateHighlightNote, onEditNote }: AnnotationListProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const toggleMenu = useCallback((id: string) => {
    setOpenMenuId((prev) => (prev === id ? null : id))
  }, [])

  const handleNoteEdit = (annotation: Annotation) => {
    if (annotation.type === 'highlight') {
      setEditingNoteId(annotation.id)
      setNoteValue(annotation.note || '')
    }
  }

  const handleNoteSave = (id: string) => {
    if (onUpdateHighlightNote) {
      onUpdateHighlightNote(id, noteValue)
    }
    setEditingNoteId(null)
    setNoteValue('')
  }

  const handleNoteCancel = () => {
    setEditingNoteId(null)
    setNoteValue('')
  }

  if (annotations.length === 0) {
    const getEmptyStateMessage = () => {
      switch (filterType) {
        case 'highlight':
          return {
            title: 'No highlights yet',
            description: 'Select text in the PDF to highlight, or save insights from chat'
          }
        case 'note':
          return {
            title: 'No notes yet',
            description: 'Create free form notes using the "New Note" button, or add notes to highlights'
          }
        case 'bookmark':
          return {
            title: 'No bookmarks yet',
            description: 'Click the bookmark icon in the page navigation to bookmark pages'
          }
        case 'saved-from-chat':
          return {
            title: 'No saved items from chat yet',
            description: 'Save insights from the chat to see them here'
          }
        default:
          return {
            title: 'No annotations yet',
            description: 'Select text in the PDF to highlight, save insights from chat, or create free form notes'
          }
      }
    }

    const emptyState = getEmptyStateMessage()

    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-12">
        <p className="text-base font-medium mb-2">{emptyState.title}</p>
        <p className="text-sm">{emptyState.description}</p>
      </div>
    )
  }

  const getAccentColor = (annotation: Annotation) => {
    if (annotation.type === 'highlight') {
      return annotation.color === 'blue'
        ? 'border-l-blue-400 dark:border-l-blue-500'
        : 'border-l-yellow-400 dark:border-l-yellow-500'
    }
    if (annotation.type === 'note') return 'border-l-green-400 dark:border-l-green-500'
    if (annotation.type === 'bookmark') return 'border-l-amber-400 dark:border-l-amber-500'
    return 'border-l-gray-300 dark:border-l-gray-600'
  }

  return (
    <div className="space-y-3">
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className={`border-l-[3px] ${getAccentColor(annotation)} pl-3 pr-3 py-3 bg-gray-50 dark:bg-gray-800/60 rounded-r-lg hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-colors ${
            annotation.pageNumber && annotation.pageNumber !== 0
              ? 'cursor-pointer'
              : ''
          }`}
          onClick={() => {
            if (annotation.pageNumber && annotation.pageNumber !== 0) {
              onNavigateToPage?.(annotation.pageNumber)
            }
          }}
        >
          {/* Header row: metadata + overflow menu */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {annotation.type === 'highlight' && annotation.pageNumber === 0 ? (
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Saved from chat</span>
              ) : annotation.type === 'bookmark' ? (
                <>
                  <svg className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Page {annotation.pageNumber}</span>
                </>
              ) : annotation.type === 'note' && !annotation.pageNumber ? (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Free Form Note</span>
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400">Page {annotation.pageNumber}</span>
              )}
            </div>
            <OverflowMenu
              annotationId={annotation.id}
              isOpen={openMenuId === annotation.id}
              onToggle={toggleMenu}
              items={
                annotation.type === 'highlight'
                  ? [
                      {
                        label: annotation.note ? 'Edit note' : 'Add a note',
                        onClick: () => handleNoteEdit(annotation),
                      },
                      {
                        label: 'Delete highlight',
                        onClick: () => onRemove(annotation.id),
                        variant: 'danger',
                      },
                    ]
                  : annotation.type === 'note'
                  ? [
                      ...(onEditNote
                        ? [{
                            label: 'Edit note',
                            onClick: () => onEditNote(annotation.id, annotation.content, annotation.pageNumber),
                          }]
                        : []),
                      {
                        label: 'Delete note',
                        onClick: () => onRemove(annotation.id),
                        variant: 'danger' as const,
                      },
                    ]
                  : [
                      {
                        label: 'Remove bookmark',
                        onClick: () => onRemove(annotation.id),
                        variant: 'danger' as const,
                      },
                    ]
              }
            />
          </div>

          {/* Body */}
          {annotation.type === 'highlight' && (
            <div>
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                {annotation.text}
              </p>
              {editingNoteId === annotation.id ? (
                <div className="mt-3 pt-3 border-t border-t-gray-200 dark:border-t-gray-700/50" onClick={(e) => e.stopPropagation()}>
                  <textarea
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded p-2 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNoteSave(annotation.id) }}
                      className="text-xs px-2.5 py-1 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNoteCancel() }}
                      className="text-xs px-2.5 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-2 border-t border-t-gray-200 dark:border-t-gray-700/50">
                  {annotation.note ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic whitespace-pre-wrap">{annotation.note}</p>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNoteEdit(annotation) }}
                      className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      Add a note...
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {annotation.type === 'note' && (
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {annotation.content}
            </p>
          )}

          {annotation.type === 'bookmark' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Bookmarked page
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
