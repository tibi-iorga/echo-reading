import { useState } from 'react'
import type { Annotation } from '@/types'
import type { ExportFormat } from './ExportDropdown'

interface ExportPreviewModalProps {
  isOpen: boolean
  annotations: Annotation[]
  documentMetadata?: { title: string; author: string | null } | null
  onExport: (format: ExportFormat) => void
  onClose: () => void
}

export function ExportPreviewModal({
  isOpen,
  annotations,
  documentMetadata,
  onExport,
  onClose,
}: ExportPreviewModalProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null)

  if (!isOpen) return null

  const highlights = annotations.filter(
    (a): a is Extract<typeof a, { type: 'highlight' }> => a.type === 'highlight'
  )
  const notes = annotations.filter((a) => a.type === 'note')
  const bookmarks = annotations.filter((a) => a.type === 'bookmark')

  const statParts: string[] = []
  if (highlights.length > 0)
    statParts.push(`${highlights.length} highlight${highlights.length !== 1 ? 's' : ''}`)
  if (notes.length > 0)
    statParts.push(`${notes.length} note${notes.length !== 1 ? 's' : ''}`)
  if (bookmarks.length > 0)
    statParts.push(`${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}`)

  const handleExport = async (format: ExportFormat) => {
    setExporting(format)
    try {
      onExport(format)
    } finally {
      // Small delay so the user sees the button state change
      setTimeout(() => setExporting(null), 300)
    }
  }

  const getHighlightBorderColor = (color?: string) => {
    return color === 'blue' ? 'border-l-blue-400' : 'border-l-yellow-400'
  }

  const getHighlightLabel = (color?: string) => {
    const colorName = color === 'blue' ? 'BLUE' : 'YELLOW'
    return `${colorName} HIGHLIGHT`
  }

  const title = documentMetadata?.title || 'Reading Notes'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Notes and Highlights
            </p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            {documentMetadata?.author && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {documentMetadata.author}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats bar */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {statParts.length > 0 ? statParts.join(' \u00B7 ') : 'No annotations'}
          </p>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {annotations.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 py-12">
              <p className="text-sm">Nothing to export yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Highlights */}
              {highlights.length > 0 && (
                <div>
                  {highlights.map((h) => (
                    <div key={h.id} className="py-4 px-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg mb-2">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-2">
                        <span
                          className={`inline-block w-0.5 h-3 rounded-full ${
                            h.color === 'blue' ? 'bg-blue-400' : 'bg-yellow-400'
                          }`}
                        />
                        {h.pageNumber === 0
                          ? 'SAVED FROM CHAT'
                          : `${getHighlightLabel(h.color)} \u00B7 PAGE ${h.pageNumber}`}
                      </p>
                      <div
                        className={`border-l-[3px] ${getHighlightBorderColor(h.color)} pl-3`}
                      >
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                          {h.text}
                        </p>
                        {h.note && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                            Note: {h.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Free form notes */}
              {notes.length > 0 && (
                <div>
                  {highlights.length > 0 && (
                    <div className="pt-4 pb-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Free Form Notes
                      </p>
                    </div>
                  )}
                  {notes.map((n) => (
                    <div key={n.id} className="py-4 px-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg mb-2">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-2">
                        <span className="inline-block w-0.5 h-3 rounded-full bg-green-400" />
                        {n.pageNumber ? `NOTE \u00B7 PAGE ${n.pageNumber}` : 'FREE FORM NOTE'}
                      </p>
                      <div className="border-l-[3px] border-l-green-400 pl-3">
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {n.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bookmarks */}
              {bookmarks.length > 0 && (
                <div>
                  {(highlights.length > 0 || notes.length > 0) && (
                    <div className="pt-4 pb-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Bookmarks
                      </p>
                    </div>
                  )}
                  {bookmarks.map((b) => (
                    <div key={b.id} className="py-3 px-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg mb-2">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-2">
                        <span className="inline-block w-0.5 h-3 rounded-full bg-amber-400" />
                        BOOKMARK \u00B7 PAGE {b.pageNumber}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with export buttons */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500">Choose a format to download</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('markdown')}
                disabled={annotations.length === 0 || exporting !== null}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {exporting === 'markdown' ? 'Exporting...' : 'Markdown'}
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={annotations.length === 0 || exporting !== null}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
              </button>
              <button
                onClick={() => handleExport('txt')}
                disabled={annotations.length === 0 || exporting !== null}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {exporting === 'txt' ? 'Exporting...' : 'Text'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
