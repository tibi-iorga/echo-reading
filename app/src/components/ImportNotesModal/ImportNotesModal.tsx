import { useState, useRef, useEffect } from 'react'
import { importAnnotations, readFileAsText } from '@/utils/import'
import { fileSyncService } from '@/services/fileSync/fileSyncService'
import type { Annotation } from '@/types'

interface ImportNotesModalProps {
  isOpen: boolean
  pdfFileName: string
  hasExistingNotes: boolean
  onImport: (annotations: Annotation[], fileHandle: FileSystemFileHandle, fileName: string) => void
  onSkip: () => void
}

export function ImportNotesModal({
  isOpen,
  pdfFileName,
  hasExistingNotes,
  onImport,
  onSkip,
}: ImportNotesModalProps) {
  const [, setStep] = useState<'select' | 'create'>('select')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setStep(hasExistingNotes ? 'select' : 'create')
      setError(null)
    }
  }, [isOpen, hasExistingNotes])

  const handleSelectFile = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!fileSyncService.isSupported()) {
        setError('File System Access API is not supported in this browser. Please use the Browse button instead.')
        setIsLoading(false)
        return
      }

      const fileHandle = await fileSyncService.requestFileHandle()
      
      if (!fileHandle) {
        // User cancelled
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

      await fileSyncService.setSyncFile(fileHandle, file.name)
      onImport(result.annotations, fileHandle, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select file')
      setIsLoading(false)
    }
  }

  const handleCreateFile = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!fileSyncService.isSupported()) {
        setError('File System Access API is not supported in this browser. Please use a modern browser like Chrome or Edge.')
        setIsLoading(false)
        return
      }

      // Generate filename from PDF name
      const baseName = pdfFileName.replace(/\.pdf$/i, '').replace(/[^a-z0-9]/gi, '_')
      const fileName = `${baseName}_notes.json`

      const fileHandle = await fileSyncService.createFileHandle(fileName)

      if (!fileHandle) {
        // User cancelled
        setIsLoading(false)
        return
      }

      await fileSyncService.setSyncFile(fileHandle, fileName)
      onImport([], fileHandle, fileName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create file')
      setIsLoading(false)
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      const content = await readFileAsText(file)
      const result = importAnnotations(content)

      if (!result.success) {
        setError(result.error || 'Failed to import notes')
        setIsLoading(false)
        return
      }

      // For file input, we need to create a new file handle
      // since we can't get a FileSystemFileHandle from a regular file input
      // We'll prompt to save it
      const baseName = pdfFileName.replace(/\.pdf$/i, '').replace(/[^a-z0-9]/gi, '_')
      const fileName = `${baseName}_notes.json`
      
      const fileHandle = await fileSyncService.createFileHandle(fileName)
      
      if (!fileHandle) {
        setIsLoading(false)
        return
      }

      await fileSyncService.setSyncFile(fileHandle, fileName)
      await fileSyncService.writeAnnotations(result.annotations)
      onImport(result.annotations, fileHandle, fileName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file')
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-50 flex items-center justify-center bg-black/50" style={{ minHeight: '100vh' }} onClick={onSkip}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Import Notes</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {hasExistingNotes
              ? 'Select your notes file to sync with this document.'
              : 'Choose where to save your notes for this document.'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {hasExistingNotes ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Select your existing notes file. All changes will sync to this file.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectFile}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isLoading ? 'Loading...' : 'Select Notes File'}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-700 dark:text-gray-300"
                  >
                    Browse
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.md"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Create a new notes file. All your notes will be saved here and sync automatically.
                </p>
                <button
                  onClick={handleCreateFile}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoading ? 'Creating...' : 'Create Notes File'}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              onClick={onSkip}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
            >
              Skip
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {hasExistingNotes ? (
              <>Select your notes file to enable automatic syncing across browsers.</>
            ) : (
              <>A new notes file will be created. You can access it from any browser.</>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
