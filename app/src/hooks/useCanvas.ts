import { useState, useCallback, useEffect, useRef } from 'react'
import { storageService } from '@/services/storage/storageService'

export function useCanvas(pdfId: string | null) {
  const [canvasContent, setCanvasContent] = useState<string>('')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (pdfId) {
      const stored = storageService.getCanvasContent(pdfId)
      setCanvasContent(stored)
    } else {
      setCanvasContent('')
    }
  }, [pdfId])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const updateCanvasContent = useCallback((content: string) => {
    setCanvasContent(content)

    // Debounce saves to localStorage (500ms)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (pdfId) {
      saveTimeoutRef.current = setTimeout(() => {
        void storageService.saveCanvasContent(pdfId, content)
      }, 500)
    }
  }, [pdfId])

  const reloadCanvas = useCallback(() => {
    if (pdfId) {
      setCanvasContent(storageService.getCanvasContent(pdfId))
    }
  }, [pdfId])

  return { canvasContent, updateCanvasContent, reloadCanvas }
}
