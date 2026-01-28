import { useState, useRef, useEffect } from 'react'
import { importAnnotations, readFileAsText } from '@/utils/import'
import { fileSyncService } from '@/services/fileSync/fileSyncService'
import type { Annotation } from '@/types'

type Step = 'fileInfo' | 'notesSync' | 'skipWarning'

interface OpenFileModalProps {
  isOpen: boolean
  pdfFileName: string
  initialTitle: string
  initialAuthor: string | null
  onComplete: (metadata: { title: string; author: string | null }, annotations: Annotation[], fileHandle: FileSystemFileHandle | null, fileName: string | null) => void
  onCancel: () => void
}

export function OpenFileModal({
  isOpen,
  pdfFileName,
  initialTitle,
  initialAuthor,
  onComplete,
  onCancel,
}: OpenFileModalProps) {
  const [step, setStep] = useState<Step>('fileInfo')
  const [title, setTitle] = useState(initialTitle)
  const [author, setAuthor] = useState(initialAuthor || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFileHandle, setSelectedFileHandle] = useState<FileSystemFileHandle | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [importedAnnotations, setImportedAnnotations] = useState<Annotation[]>([])
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setStep('fileInfo')
      setTitle(initialTitle)
      setAuthor(initialAuthor || '')
      setError(null)
      setSelectedFileHandle(null)
      setSelectedFileName(null)
      setImportedAnnotations([])
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, initialTitle, initialAuthor])

  const handleFileInfoContinue = () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required')
      return
    }
    setError(null)
    setStep('notesSync')
  }

  const handleSelectExistingFile = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!fileSyncService.isSupported()) {
        setError('File System Access API is not supported in this browser. Please use a modern browser like Chrome or Edge to sync notes files.')
        setIsLoading(false)
        return
      }

      const fileHandle = await fileSyncService.requestFileHandle()
      
      if (!fileHandle) {
        setIsLoading(false)
        return
      }

      const file = await fileHandle.getFile()
      const content = await readFileAsText(file)
      const result = importAnnotations(content)

      if (!result.success) {
        setError(result.error || 'Failed to import notes')
        setIsLoading(false)
        return
      }

      setSelectedFileHandle(fileHandle)
      setSelectedFileName(file.name)
      setImportedAnnotations(result.annotations)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select file')
      setIsLoading(false)
    }
  }

  const handleCreateNewFile = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!fileSyncService.isSupported()) {
        setError('File System Access API is not supported in this browser. Please use a modern browser like Chrome or Edge.')
        setIsLoading(false)
        return
      }

      const baseName = pdfFileName.replace(/\.pdf$/i, '').replace(/[^a-z0-9]/gi, '_')
      const fileName = `${baseName}_sync_notes.json`

      const fileHandle = await fileSyncService.createFileHandle(fileName)

      if (!fileHandle) {
        setIsLoading(false)
        return
      }

      setSelectedFileHandle(fileHandle)
      setSelectedFileName(fileName)
      setImportedAnnotations([])
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create file')
      setIsLoading(false)
    }
  }

  const handleFinish = () => {
    if (selectedFileHandle && selectedFileName) {
      onComplete(
        { title: title.trim(), author: author.trim() || null },
        importedAnnotations,
        selectedFileHandle,
        selectedFileName
      )
    } else {
      // No file selected, show warning
      setStep('skipWarning')
    }
  }

  const handleSkipConfirm = () => {
    onComplete(
      { title: title.trim(), author: author.trim() || null },
      [],
      null,
      null
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (step === 'fileInfo') {
        handleFileInfoContinue()
      } else if (step === 'notesSync') {
        handleFinish()
      }
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OpenFileModal.tsx:166',message:'OpenFileModal render',data:{isOpen,pdfFileName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  if (!isOpen) return null

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OpenFileModal.tsx:169',message:'OpenFileModal rendering overlay',data:{isOpen},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'fileInfo' ? 'bg-blue-500 dark:bg-blue-600 text-white' : step === 'notesSync' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                1
              </div>
              <div className={`w-12 h-0.5 ${step === 'notesSync' || step === 'skipWarning' ? 'bg-blue-500 dark:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'notesSync' ? 'bg-blue-500 dark:bg-blue-600 text-white' : step === 'skipWarning' ? 'bg-orange-500 dark:bg-orange-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                2
              </div>
            </div>
          </div>

          {/* Step 1: File Information */}
          {step === 'fileInfo' && (
            <>
              <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Open File</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Help the assistant understand what you're reading. This information will be included in your conversations.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      setError(null)
                    }}
                    placeholder="File or document title"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleFileInfoContinue()
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Author name (optional)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleFileInfoContinue()
                      }
                    }}
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileInfoContinue}
                  disabled={!title.trim()}
                  className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* Step 2: Notes Synchronization */}
          {step === 'notesSync' && (
            <>
              <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Sync Your Notes</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Link a notes file to sync your annotations across browsers and devices.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              {selectedFileHandle && selectedFileName && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-400">
                  Notes file selected: <span className="font-mono">{selectedFileName}</span>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Select an existing notes file or create a new one. All your notes will sync automatically.
                </p>
                
                <div className="space-y-2">
                  <button
                    onClick={handleSelectExistingFile}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Select Existing Notes File</span>
                      </>
                    )}
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">Or</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateNewFile}
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create Sync File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-6">
                <button
                  onClick={() => setStep('fileInfo')}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
                >
                  Back
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleFinish}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
                  >
                    Skip Notes
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={isLoading || !selectedFileHandle}
                    className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Finish
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Skip Warning */}
          {step === 'skipWarning' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-300">Notes Not Synced</h2>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  You have chosen not to link a notes file. Your notes for this file will only be saved locally in this browser session.
                </p>

                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-4">
                  <p className="text-sm text-orange-800 dark:text-orange-300 font-medium mb-2">Important:</p>
                  <ul className="text-sm text-orange-700 dark:text-orange-400 space-y-1 list-disc list-inside">
                    <li>If you close your browser, your notes may be lost</li>
                    <li>If you switch devices or browsers, your notes won't be available</li>
                    <li>If you clear your browser data, your notes will be deleted</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We recommend linking a notes file for persistent storage across all your devices and browsers.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 mt-6">
                <button
                  onClick={() => setStep('notesSync')}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Go Back to Notes
                </button>
                <button
                  onClick={handleSkipConfirm}
                  className="px-4 py-2 bg-orange-500 dark:bg-orange-600 text-white rounded hover:bg-orange-600 dark:hover:bg-orange-700 text-sm"
                >
                  Proceed Without Syncing
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
