import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as supabaseService from '@/services/supabase/supabaseService'
import type { BookRow } from '@/services/supabase/types'
import App from '@/App'

const SIGNED_URL_CACHE_MAX = 10

/** Module-level cache: bookId → signed URL. Persists across route changes within a session. */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

function cacheSignedUrl(bookId: string, url: string): void {
  if (signedUrlCache.size >= SIGNED_URL_CACHE_MAX) {
    const oldestKey = signedUrlCache.keys().next().value as string
    signedUrlCache.delete(oldestKey)
  }
  // Cache for 50 minutes (URLs expire at 60 min, leave 10 min buffer)
  signedUrlCache.set(bookId, { url, expiresAt: Date.now() + 50 * 60 * 1000 })
}

function getCachedSignedUrl(bookId: string): string | null {
  const entry = signedUrlCache.get(bookId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    signedUrlCache.delete(bookId)
    return null
  }
  return entry.url
}

/**
 * ReadingView fetches a signed URL for the book's PDF and passes it
 * to App, which uses react-pdf to stream pages on demand via range requests.
 * No full-file download is needed.
 */
export function ReadingView() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<BookRow | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBook = useCallback(async () => {
    if (!bookId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch book metadata (always fresh — lightweight row fetch)
      const bookData = await supabaseService.getBook(bookId)
      if (!bookData) {
        setError('Book not found')
        setLoading(false)
        return
      }
      setBook(bookData)

      // Use cached signed URL if still valid, otherwise fetch a new one
      const cached = getCachedSignedUrl(bookId)
      if (cached) {
        setPdfUrl(cached)
        return
      }

      const signedUrl = await supabaseService.getSignedPdfUrl(bookData.storage_path)
      cacheSignedUrl(bookId, signedUrl)
      setPdfUrl(signedUrl)
    } catch (err) {
      console.error('Failed to load book:', err)
      setError(err instanceof Error ? err.message : 'Failed to load book')
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    loadBook()
  }, [loadBook])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-500 dark:text-gray-400">Loading book...</div>
      </div>
    )
  }

  if (error || !book || !pdfUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 gap-4">
        <div className="text-red-500">{error || 'Something went wrong'}</div>
        <button
          onClick={() => navigate('/library')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to library
        </button>
      </div>
    )
  }

  return <App bookId={bookId!} book={book} pdfUrl={pdfUrl} />
}
