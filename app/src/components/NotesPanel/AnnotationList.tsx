import { useState } from 'react'
import type { Annotation } from '@/types'

interface AnnotationListProps {
  annotations: Annotation[]
  filterType?: 'all' | 'highlight' | 'note' | 'bookmark' | 'saved-from-chat'
  onRemove: (id: string) => void
  onNavigateToPage?: (pageNumber: number) => void
  onUpdateHighlightNote?: (id: string, note: string) => void
  onEditNote?: (id: string, content: string, pageNumber?: number) => void
}

export function AnnotationList({ annotations, filterType = 'all', onRemove, onNavigateToPage, onUpdateHighlightNote, onEditNote }: AnnotationListProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState('')

  const handleHighlightClick = (pageNumber: number) => {
    onNavigateToPage?.(pageNumber)
  }

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

  return (
    <div className="space-y-4">
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className="border border-gray-200 dark:border-gray-700 rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {annotation.type === 'highlight' && (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {annotation.pageNumber === 0 ? (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Saved from chat</span>
                  ) : (
                    <>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Page {annotation.pageNumber}</span>
                      <button
                        onClick={() => handleHighlightClick(annotation.pageNumber)}
                        className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                      >
                        Go to page
                      </button>
                    </>
                  )}
                </div>
                <p 
                  className={`mt-1 text-sm p-2 rounded ${
                    annotation.color === 'blue' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200' 
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-gray-900 dark:text-yellow-100'
                  } ${annotation.pageNumber !== 0 ? 'cursor-pointer' : ''}`}
                  onClick={() => annotation.pageNumber !== 0 && handleHighlightClick(annotation.pageNumber)}
                >
                  {annotation.text}
                </p>
                {editingNoteId === annotation.id ? (
                  <div className="mt-2">
                    <textarea
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded p-2 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => handleNoteSave(annotation.id)}
                        className="text-xs px-2 py-1 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleNoteCancel}
                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    {annotation.note ? (
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{annotation.note}</p>
                        <button
                          onClick={() => handleNoteEdit(annotation)}
                          className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-1"
                        >
                          Edit note
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleNoteEdit(annotation)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 italic"
                      >
                        + Add note
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => onRemove(annotation.id)}
                className="ml-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
              >
                ×
              </button>
            </div>
          )}

          {annotation.type === 'note' && (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {annotation.pageNumber ? (
                    <>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Page {annotation.pageNumber}</span>
                      <button
                        onClick={() => onNavigateToPage?.(annotation.pageNumber!)}
                        className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 underline"
                      >
                        Go to page
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Free Form Note</span>
                  )}
                </div>
                <p className="mt-1 text-sm p-2 rounded bg-green-100 dark:bg-green-900/30 text-gray-900 dark:text-green-100 whitespace-pre-wrap">
                  {annotation.content}
                </p>
                {onEditNote && (
                  <button
                    onClick={() => onEditNote(annotation.id, annotation.content, annotation.pageNumber)}
                    className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 mt-1"
                  >
                    Edit note
                  </button>
                )}
              </div>
              <button
                onClick={() => onRemove(annotation.id)}
                className="ml-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
              >
                ×
              </button>
            </div>
          )}

          {annotation.type === 'bookmark' && (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Page {annotation.pageNumber}</span>
                  <button
                    onClick={() => onNavigateToPage?.(annotation.pageNumber)}
                    className="text-xs text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 underline"
                  >
                    Go to page
                  </button>
                </div>
                <div className="mt-1 text-sm p-2 rounded bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-gray-700 dark:text-yellow-100">
                  Bookmark
                </div>
              </div>
              <button
                onClick={() => onRemove(annotation.id)}
                className="ml-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
              >
                ×
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
