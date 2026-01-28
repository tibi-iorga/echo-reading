import { useState, useCallback, useEffect } from 'react'
import type { Annotation, TextSelection } from '@/types'
import { storageService } from '@/services/storage/storageService'

export function useAnnotations(pdfId: string | null) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [reloadTrigger, setReloadTrigger] = useState(0)

  useEffect(() => {
    if (pdfId) {
      const stored = storageService.getAnnotations(pdfId)
      setAnnotations(stored)
    } else {
      setAnnotations([])
    }
  }, [pdfId, reloadTrigger])

  const reloadAnnotations = useCallback(() => {
    setReloadTrigger(prev => prev + 1)
  }, [])

  const addHighlight = useCallback((selection: TextSelection, note?: string, color?: string) => {
    const highlight: Annotation = {
      id: `highlight_${Date.now()}`,
      type: 'highlight',
      ...selection,
      note,
      color,
      createdAt: new Date(),
    }
    setAnnotations((prev) => {
      const updated = [...prev, highlight]
      if (pdfId) {
        storageService.saveAnnotations(pdfId, updated).catch(console.error)
      }
      return updated
    })
  }, [pdfId])
  
  const updateHighlightNote = useCallback((id: string, note: string) => {
    setAnnotations((prev) => {
      const updated = prev.map((a) => 
        a.id === id && a.type === 'highlight' 
          ? { ...a, note }
          : a
      )
      if (pdfId) {
        storageService.saveAnnotations(pdfId, updated).catch(console.error)
      }
      return updated
    })
  }, [pdfId])

  const addNote = useCallback((content: string, pageNumber?: number) => {
    const note: Annotation = {
      id: `note_${Date.now()}`,
      type: 'note',
      content,
      pageNumber,
      createdAt: new Date(),
    }
    setAnnotations((prev) => {
      const updated = [...prev, note]
      if (pdfId) {
        storageService.saveAnnotations(pdfId, updated).catch(console.error)
      }
      return updated
    })
  }, [pdfId])

  const updateNote = useCallback((id: string, content: string, pageNumber?: number) => {
    setAnnotations((prev) => {
      const updated = prev.map((a) => 
        a.id === id && a.type === 'note' 
          ? { ...a, content, pageNumber }
          : a
      )
      if (pdfId) {
        storageService.saveAnnotations(pdfId, updated).catch(console.error)
      }
      return updated
    })
  }, [pdfId])

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => {
      const updated = prev.filter((a) => a.id !== id)
      if (pdfId) {
        storageService.saveAnnotations(pdfId, updated).catch(console.error)
      }
      return updated
    })
  }, [pdfId])

  const addBookmark = useCallback((pageNumber: number) => {
    setAnnotations((prev) => {
      // Check if bookmark already exists for this page
      const existingBookmark = prev.find(
        (a) => a.type === 'bookmark' && a.pageNumber === pageNumber
      )
      if (existingBookmark) {
        // Remove existing bookmark
        const updated = prev.filter((a) => a.id !== existingBookmark.id)
        if (pdfId) {
          storageService.saveAnnotations(pdfId, updated).catch(console.error)
        }
        return updated
      }
      // Add new bookmark
      const bookmark: Annotation = {
        id: `bookmark_${Date.now()}`,
        type: 'bookmark',
        pageNumber,
        createdAt: new Date(),
      }
      const updated = [...prev, bookmark]
      if (pdfId) {
        storageService.saveAnnotations(pdfId, updated).catch(console.error)
      }
      return updated
    })
  }, [pdfId])

  const clearAllAnnotations = useCallback(() => {
    setAnnotations([])
    if (pdfId) {
      storageService.saveAnnotations(pdfId, []).catch(console.error)
    }
  }, [pdfId])

  return {
    annotations,
    addHighlight,
    updateHighlightNote,
    addNote,
    updateNote,
    addBookmark,
    removeAnnotation,
    clearAllAnnotations,
    reloadAnnotations,
  }
}
