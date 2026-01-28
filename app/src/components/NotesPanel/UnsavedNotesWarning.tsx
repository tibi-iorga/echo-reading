interface UnsavedNotesWarningProps {
  onCreateSyncFile: () => void
  onDismiss: () => void
}

export function UnsavedNotesWarning({ onCreateSyncFile, onDismiss }: UnsavedNotesWarningProps) {

  return (
    <div className="mx-4 mt-4 mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
            Your notes are not synced
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            Please create a sync file to prevent data loss. Notes are currently stored locally and may be lost if browser data is cleared.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onCreateSyncFile}
              className="px-3 py-1.5 border border-yellow-600 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 rounded text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
            >
              Create Sync File
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors flex-shrink-0"
          aria-label="Dismiss warning"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
