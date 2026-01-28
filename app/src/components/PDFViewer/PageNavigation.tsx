interface PageNavigationProps {
  pageNumber: number
  numPages: number
  onPageChange: (page: number) => void
  onBookmark?: (pageNumber: number) => void
  isBookmarked?: boolean
}

export function PageNavigation({
  pageNumber,
  numPages,
  onPageChange,
  onBookmark,
  isBookmarked = false,
}: PageNavigationProps) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const page = parseInt(value, 10)
    if (!isNaN(page) && page >= 1 && page <= numPages) {
      onPageChange(page)
    }
  }

  const handleBookmark = () => {
    if (onBookmark) {
      onBookmark(pageNumber)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-sm relative">
      <div className="flex items-center justify-center gap-3 flex-1">
        <button
          onClick={handlePrevious}
          disabled={pageNumber <= 1}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium text-gray-900 dark:text-white"
        >
          Previous
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Page</span>
          <input
            type="number"
            min={1}
            max={numPages}
            value={pageNumber}
            onChange={handleInputChange}
            className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">of {numPages}</span>
        </div>
        <button
          onClick={handleNext}
          disabled={pageNumber >= numPages}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium text-gray-900 dark:text-white"
        >
          Next
        </button>
      </div>
      {onBookmark && (
        <button
          onClick={handleBookmark}
          className={`px-3 py-2 rounded text-sm font-medium ${
            isBookmarked
              ? 'bg-blue-400 dark:bg-blue-600 hover:bg-blue-500 dark:hover:bg-blue-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
          }`}
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
    </div>
  )
}
