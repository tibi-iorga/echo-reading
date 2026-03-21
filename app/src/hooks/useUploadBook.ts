import { useState, useCallback } from 'react'
import { useAuth } from '@clerk/react'
import * as supabaseService from '@/services/api/apiService'
import type { BookRow } from '@/services/api/types'
import { parseFilename } from '@/utils/filenameParser'
import { extractPdfCover } from '@/utils/pdfCoverExtractor'

export function useUploadBook(onComplete?: (book: BookRow) => void, onBackgroundDone?: () => void) {
  const { userId } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File, metadata?: { title: string; author: string | null }) => {
    if (!userId) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { title, author } = metadata ?? parseFilename(file.name)
      const bookId = crypto.randomUUID()
      const storagePath = `${userId}/${bookId}.pdf`
      const coverPath = `${userId}/${bookId}_cover.jpg`

      // Start cover extraction in parallel with the upload
      setProgress('Uploading...')
      const coverPromise = extractPdfCover(file).catch(() => null)

      // Create book record with cover_path set upfront + upload PDF in parallel
      const [book] = await Promise.all([
        supabaseService.createBookWithId(bookId, {
          clerk_user_id: userId,
          title,
          author,
          filename: file.name,
          file_size: file.size,
          storage_path: storagePath,
          cover_path: coverPath,
          num_pages: null,
        }),
        supabaseService.uploadPDFToPath(storagePath, file),
      ])

      // Book is ready to show — unblock the UI immediately
      setProgress('')
      setUploading(false)
      onComplete?.(book)

      // Fire-and-forget: cover upload + reading progress init (not on critical path)
      coverPromise.then((coverBlob) =>
        Promise.all([
          supabaseService.saveReadingProgress(book.id, userId, {
            current_page: 1,
            furthest_page: 1,
            last_page_read: 1,
            scale: 1.5,
          }),
          coverBlob
            ? supabaseService.uploadCover(coverPath, coverBlob).catch(() => {})
            : Promise.resolve(),
        ])
      ).then(() => onBackgroundDone?.()).catch(console.error)
    } catch (err) {
      console.error('Failed to upload book:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload book')
      setUploading(false)
      setProgress('')
    }
  }, [userId, onComplete, onBackgroundDone])

  return { upload, uploading, progress, error }
}
