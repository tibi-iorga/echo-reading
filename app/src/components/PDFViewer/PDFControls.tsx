import { useState, useRef, useEffect } from 'react'

interface PDFControlsProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}

export function PDFControls({
  scale,
  onZoomIn,
  onZoomOut,
  onFit,
}: PDFControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const zoomPercentage = Math.round(scale * 100)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm flex items-center gap-1 text-gray-900 dark:text-white"
        title="Format options"
      >
        <span>Format</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[200px] z-50">
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Zoom</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{zoomPercentage}%</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <button
                onClick={onZoomOut}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm flex-1 text-gray-900 dark:text-white"
                title="Zoom Out"
              >
                −
              </button>
              <button
                onClick={onZoomIn}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm flex-1 text-gray-900 dark:text-white"
                title="Zoom In"
              >
                +
              </button>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            <button
              onClick={() => {
                onFit()
                setIsOpen(false)
              }}
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-900 dark:text-white"
            >
              Fit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
