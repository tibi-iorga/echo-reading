import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserButton } from '@clerk/react'
import { useLibrary } from '@/hooks/useLibrary'
import { useUploadBook } from '@/hooks/useUploadBook'
import { BookCard } from './BookCard'
import { UploadModal } from './UploadModal'
import { EditBookModal } from './EditBookModal'
import { ConfirmModal } from '@/components/ConfirmModal/ConfirmModal'
import * as supabaseService from '@/services/supabase/supabaseService'
import type { BookRow } from '@/services/supabase/types'

export function LibraryView() {
  const navigate = useNavigate()
  const { books, coverUrls, loading, error, silentRefresh, addBookOptimistically, removeBook } = useLibrary()

  const handleUploadComplete = useCallback((book: BookRow) => {
    addBookOptimistically(book)
    silentRefresh()
    setSelectedFile(null)
  }, [addBookOptimistically, silentRefresh])

  const { upload, uploading, progress, error: uploadError } = useUploadBook(handleUploadComplete, silentRefresh)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; storagePath: string } | null>(null)
  const [editTarget, setEditTarget] = useState<{ id: string; title: string; author: string | null } | null>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleUpload = useCallback((file: File, metadata: { title: string; author: string | null }) => {
    upload(file, metadata)
  }, [upload])

  const handleCancelUpload = useCallback(() => {
    if (!uploading) setSelectedFile(null)
  }, [uploading])

  const handleChangeFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(file)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleEditSave = useCallback(async (metadata: { title: string; author: string | null }) => {
    if (!editTarget) return
    try {
      await supabaseService.updateBook(editTarget.id, metadata)
      silentRefresh()
    } catch {
      // Error logged in service
    }
    setEditTarget(null)
  }, [editTarget, silentRefresh])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await removeBook(deleteTarget.id, deleteTarget.storagePath)
    } catch {
      // Error already logged in hook
    }
    setDeleteTarget(null)
  }, [deleteTarget, removeBook])

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-950"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-blue-500/10 border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-900 rounded-lg px-6 py-4 shadow-lg text-blue-600 dark:text-blue-400 font-medium">
            Drop PDF to upload
          </div>
        </div>
      )}

      {/* Hidden file input shared by Upload button and modal's Change button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Echo
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Upload
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {(error || uploadError) && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error || uploadError}
          </div>
        )}

        {/* Book grid */}
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-16">
            Loading your library...
          </div>
        ) : books.length === 0 ? (
          <div className="max-w-2xl mx-auto py-16">
            {/* Hero empty state */}
            <div className="text-center mb-10">
              <div className="text-gray-300 dark:text-gray-600 mb-5">
                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" strokeWidth={0.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Upload your first PDF to get started</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Drag a file onto this page or use the upload button above</p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <div className="text-blue-500 dark:text-blue-400 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">AI Chat</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ask questions about your document using your own API key</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <div className="text-amber-500 dark:text-amber-400 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Annotations</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Highlight passages and add notes as you read</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <div className="text-emerald-500 dark:text-emerald-400 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Canvas</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Write structured notes alongside your reading</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                coverUrl={book.cover_path ? coverUrls.get(book.cover_path) ?? null : null}
                onEdit={() => setEditTarget({ id: book.id, title: book.title, author: book.author })}
                onDelete={() => setDeleteTarget({ id: book.id, title: book.title, storagePath: book.storage_path })}
              />
            ))}
          </div>
        )}
      </main>

      {/* Upload modal — only shown after a file is selected */}
      {selectedFile && (
        <UploadModal
          isOpen={!!selectedFile}
          file={selectedFile}
          uploading={uploading}
          progress={progress}
          onUpload={handleUpload}
          onCancel={handleCancelUpload}
          onChangeFile={handleChangeFile}
        />
      )}

      {/* Edit book modal */}
      <EditBookModal
        isOpen={!!editTarget}
        title={editTarget?.title ?? ''}
        author={editTarget?.author ?? null}
        onSave={handleEditSave}
        onCancel={() => setEditTarget(null)}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete book"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will remove the PDF and all annotations, notes, and chat history.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
