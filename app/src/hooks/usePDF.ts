import { useState, useCallback } from 'react'
import type { PDFDocument } from '@/types'

export function usePDF() {
  const [pdf, setPdf] = useState<PDFDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPDF = useCallback((file: File) => {
    setLoading(true)
    setError(null)

    const url = URL.createObjectURL(file)
    setPdf({
      file,
      url,
      numPages: 0,
    })
    setLoading(false)
  }, [])

  const loadPDFFromUrl = useCallback((url: string) => {
    setLoading(true)
    setError(null)
    setPdf({
      url,
      numPages: 0,
    })
    setLoading(false)
  }, [])

  const clearPDF = useCallback(() => {
    if (pdf?.file && pdf?.url) {
      URL.revokeObjectURL(pdf.url)
    }
    setPdf(null)
    setError(null)
  }, [pdf])

  return {
    pdf,
    loading,
    error,
    loadPDF,
    loadPDFFromUrl,
    clearPDF,
  }
}
