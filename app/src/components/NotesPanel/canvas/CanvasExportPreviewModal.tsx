import { useState } from 'react'
import type { ExportFormat } from '../ExportDropdown'
import { exportCanvasToText } from '@/utils/export'

interface CanvasExportPreviewModalProps {
  isOpen: boolean
  canvasHtml: string
  documentMetadata?: { title: string; author: string | null } | null
  onExport: (format: ExportFormat) => void
  onClose: () => void
}

export function CanvasExportPreviewModal({
  isOpen,
  canvasHtml,
  documentMetadata,
  onExport,
  onClose,
}: CanvasExportPreviewModalProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const isEmpty = !canvasHtml || canvasHtml === '<p></p>'

  const title = documentMetadata?.title || 'Canvas'

  const handleExport = async (format: ExportFormat) => {
    setExporting(format)
    try {
      onExport(format)
    } finally {
      setTimeout(() => setExporting(null), 300)
    }
  }

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
              Canvas
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

        {/* Preview body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {isEmpty ? (
            <div className="text-center text-gray-400 dark:text-gray-500 py-12">
              <p className="text-sm">Nothing to export yet.</p>
            </div>
          ) : (
            <div
              className="canvas-editor"
              dangerouslySetInnerHTML={{ __html: canvasHtml }}
            />
          )}
        </div>

        {/* Footer with export buttons */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={async () => {
                const text = exportCanvasToText(canvasHtml, documentMetadata ? { title: documentMetadata.title, author: documentMetadata.author } : undefined)
                await navigator.clipboard.writeText(text)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              disabled={isEmpty}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('markdown')}
                disabled={isEmpty || exporting !== null}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {exporting === 'markdown' ? 'Exporting...' : 'Markdown'}
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isEmpty || exporting !== null}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
              </button>
              <button
                onClick={() => handleExport('txt')}
                disabled={isEmpty || exporting !== null}
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
