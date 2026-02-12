import { useState, useRef, useEffect } from 'react'
import { ConfirmModal } from '@/components/ConfirmModal/ConfirmModal'
import { ShortcutsModal } from '@/components/ShortcutsModal/ShortcutsModal'

interface PDFToolbarProps {
  // Document controls
  onClose: () => void
  pdfFileName?: string
  
  // Page navigation
  pageNumber: number
  numPages: number
  onPageChange: (page: number) => void
  
  // Bookmark
  onBookmark?: () => void
  isBookmarked?: boolean
  
  // Zoom controls
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitWidth: () => void
  
  // Sync controls
  onSyncLastPage?: () => void
  onSyncFurthestPage?: () => void
  lastPageRead?: number | null
  furthestPage?: number | null
  
  // Has unsaved changes (for close confirmation)
  hasUnsavedChanges?: boolean
}

export function PDFToolbar({
  onClose,
  pdfFileName,
  pageNumber,
  numPages,
  onPageChange,
  onBookmark,
  isBookmarked = false,
  scale: _scale, // Reserved for future use
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onSyncLastPage,
  onSyncFurthestPage,
  lastPageRead,
  furthestPage,
  hasUnsavedChanges = false,
}: PDFToolbarProps) {
  const [isEditingPage, setIsEditingPage] = useState(false)
  const [pageInputValue, setPageInputValue] = useState(pageNumber.toString())
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showSyncMenu, setShowSyncMenu] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const syncMenuRef = useRef<HTMLDivElement>(null)

  // Update input value when page changes externally
  useEffect(() => {
    if (!isEditingPage) {
      setPageInputValue(pageNumber.toString())
    }
  }, [pageNumber, isEditingPage])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingPage && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingPage])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (syncMenuRef.current && !syncMenuRef.current.contains(event.target as Node)) {
        setShowSyncMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePrevious = () => {
    if (pageNumber > 1) {
      onPageChange(pageNumber - 1)
    }
  }

  const handleNext = () => {
    if (pageNumber < numPages) {
      onPageChange(pageNumber + 1)
    }
  }

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInputValue, 10)
    if (!isNaN(page) && page >= 1 && page <= numPages) {
      onPageChange(page)
    } else {
      setPageInputValue(pageNumber.toString())
    }
    setIsEditingPage(false)
  }

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit()
    } else if (e.key === 'Escape') {
      setPageInputValue(pageNumber.toString())
      setIsEditingPage(false)
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  const handleConfirmClose = () => {
    onClose()
  }

  // scale is available but not displayed

  // Reserved for future use
  // const buttonClass = "h-9 px-2 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
  const iconButtonClass = "w-9 h-9 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
  const disabledButtonClass = "w-9 h-9 flex items-center justify-center rounded text-gray-400 dark:text-gray-600 cursor-not-allowed"

  return (
    <div className="relative flex items-center px-3 py-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 w-full flex-shrink-0">
      {/* Left section: Close */}
      <div className="flex items-center gap-1">
        {/* Close/Exit PDF - with confirmation */}
        <button
          onClick={handleClose}
          className={iconButtonClass}
          title={pdfFileName ? `Close: ${pdfFileName}` : 'Return to file picker'}
        >
            {/* Home icon - return to file picker */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
      </div>

      {/* Center section: Page navigation - absolutely positioned for true centering */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1">
        {/* Previous page */}
        <button
          onClick={handlePrevious}
          disabled={pageNumber <= 1}
          className={pageNumber <= 1 ? disabledButtonClass : iconButtonClass}
          title="Previous page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page indicator / input */}
        {isEditingPage ? (
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={numPages}
            value={pageInputValue}
            onChange={(e) => setPageInputValue(e.target.value)}
            onBlur={handlePageInputSubmit}
            onKeyDown={handlePageInputKeyDown}
            className="w-16 h-9 text-center text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        ) : (
          <button
            onClick={() => setIsEditingPage(true)}
            className="h-9 px-3 flex items-center justify-center text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Click to edit page number"
          >
            <span className="font-medium text-gray-900 dark:text-white">{pageNumber}</span>
            <span className="text-gray-500 dark:text-gray-500 mx-1">/</span>
            <span className="text-gray-500 dark:text-gray-500">{numPages}</span>
          </button>
        )}

        {/* Next page */}
        <button
          onClick={handleNext}
          disabled={pageNumber >= numPages}
          className={pageNumber >= numPages ? disabledButtonClass : iconButtonClass}
          title="Next page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Right section: Zoom controls, Reading position, Bookmark */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Zoom in */}
        <button
          onClick={onZoomIn}
          className={iconButtonClass}
          title="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>

        {/* Zoom out */}
        <button
          onClick={onZoomOut}
          className={iconButtonClass}
          title="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>

        {/* Fit to width */}
        <button
          onClick={onFitWidth}
          className={iconButtonClass}
          title="Fit to width"
        >
          {/* Fit to width icon - horizontal arrows pointing left and right */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {/* Left arrow pointing left */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 12H4m0 0l4-4m-4 4l4 4" />
            {/* Right arrow pointing right */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 12h6m0 0l-4-4m4 4l-4 4" />
          </svg>
        </button>

        {/* Separator */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Reading position - Dropdown */}
        {(onSyncLastPage || onSyncFurthestPage) && (
          <div className="relative" ref={syncMenuRef}>
            <button
              onClick={() => setShowSyncMenu(!showSyncMenu)}
              className={iconButtonClass}
              title="Reading position"
            >
              {/* Clock/history icon */}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            {showSyncMenu && (
              <div className="absolute right-0 bottom-12 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
                {onSyncLastPage && (
                  <button
                    onClick={() => {
                      onSyncLastPage()
                      setShowSyncMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Last page read{lastPageRead !== null ? ` (p. ${lastPageRead})` : ''}
                  </button>
                )}
                {onSyncFurthestPage && (
                  <button
                    onClick={() => {
                      onSyncFurthestPage()
                      setShowSyncMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Furthest read{furthestPage !== null ? ` (p. ${furthestPage})` : ''}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Separator */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Bookmark */}
        {onBookmark && (
          <button
            onClick={onBookmark}
            className={`${iconButtonClass} ${isBookmarked ? 'text-blue-500 dark:text-blue-400' : ''}`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
          >
            {isBookmarked ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
          </button>
        )}

        {/* Separator */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Shortcuts */}
        <button
          onClick={() => setShowShortcutsModal(true)}
          className={`${iconButtonClass} focus:outline-none`}
          title="Keyboard shortcuts"
        >
          <span className="text-base font-semibold text-gray-600 dark:text-gray-400">?</span>
        </button>
      </div>

      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Close Confirmation Modal */}
      <ConfirmModal
        isOpen={showCloseConfirm}
        title="Close Document"
        message="Are you sure you want to close this document?"
        confirmText="Close"
        cancelText="Cancel"
        onConfirm={handleConfirmClose}
        onCancel={() => setShowCloseConfirm(false)}
        variant="danger"
      />
    </div>
  )
}
