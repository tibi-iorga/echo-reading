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
    
    const reader = new FileReader()
    reader.onload = () => {
      setPdf({
        file,
        url,
        numPages: 0,
      })
      setLoading(false)
    }

    reader.onerror = () => {
      setError('Failed to load PDF')
      setLoading(false)
      URL.revokeObjectURL(url)
    }

    reader.readAsArrayBuffer(file)
  }, [])

  const clearPDF = useCallback(() => {
    if (pdf?.url) {
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
    clearPDF,
  }
}
