import { useState, useCallback, useEffect, useRef } from 'react'
import * as supabaseService from '@/services/api/apiService'

export function useCanvas(pdfId: string | null, userId?: string | null) {
  const [canvasContent, setCanvasContent] = useState<string>('')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load canvas content from Supabase
  useEffect(() => {
    if (pdfId) {
      supabaseService.getCanvasContent(pdfId)
        .then(setCanvasContent)
        .catch((err) => {
          console.warn('Failed to load canvas content:', err)
          setCanvasContent('')
        })
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

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (pdfId && userId) {
      saveTimeoutRef.current = setTimeout(() => {
        supabaseService.saveCanvasContent(pdfId, userId, content).catch(console.error)
      }, 500)
    }
  }, [pdfId, userId])

  return { canvasContent, updateCanvasContent }
}
