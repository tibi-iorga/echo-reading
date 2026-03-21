import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/react'
import * as supabaseService from '@/services/api/apiService'
import type { BookRow, BookWithProgress } from '@/services/api/types'

export function useLibrary() {
  const { userId } = useAuth()
  const [books, setBooks] = useState<BookWithProgress[]>([])
  const [coverUrls, setCoverUrls] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBooks = useCallback(async (silent: boolean) => {
    if (!userId) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await supabaseService.listBooks(userId)
      setBooks(data)

      // Batch-fetch all cover URLs in a single request
      const paths = data.map((b) => b.cover_path).filter((p): p is string => !!p)
      if (paths.length > 0) {
        const urls = await supabaseService.getSignedCoverUrls(paths)
        setCoverUrls(urls)
      }
    } catch (err) {
      console.error('Failed to load books:', err)
      if (!silent) setError('Failed to load your library')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [userId])

  const loadBooks = useCallback(() => fetchBooks(false), [fetchBooks])
  const silentRefresh = useCallback(() => fetchBooks(true), [fetchBooks])

  const addBookOptimistically = useCallback((book: BookRow) => {
    const bookWithProgress: BookWithProgress = { ...book, reading_progress: null }
    setBooks((prev) => [bookWithProgress, ...prev])
  }, [])

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  const removeBook = useCallback(async (bookId: string, storagePath: string) => {
    try {
      await supabaseService.deleteBook(bookId, storagePath)
      setBooks((prev) => prev.filter((b) => b.id !== bookId))
    } catch (err) {
      console.error('Failed to delete book:', err)
      throw err
    }
  }, [])

  return { books, coverUrls, loading, error, loadBooks, silentRefresh, addBookOptimistically, removeBook }
}
