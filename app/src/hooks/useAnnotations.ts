import { useState, useCallback, useEffect } from 'react'
import type { Annotation, TextSelection } from '@/types'
import * as api from '@/services/api/apiService'

export function useAnnotations(pdfId: string | null, userId?: string | null) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])

  // Load annotations from the API
  useEffect(() => {
    if (pdfId) {
      api.getAnnotations(pdfId)
        .then(setAnnotations)
        .catch((err) => {
          console.warn('Failed to load annotations:', err)
          setAnnotations([])
        })
    } else {
      setAnnotations([])
    }
  }, [pdfId])

  const addHighlight = useCallback((selection: TextSelection, note?: string, color?: string) => {
    if (!pdfId || !userId) return
    const highlight: Annotation = {
      id: `highlight_${Date.now()}`,
      type: 'highlight',
      ...selection,
      note,
      color,
      createdAt: new Date(),
    }
    setAnnotations((prev) => [...prev, highlight])
    api.upsertAnnotation(pdfId, userId, highlight).catch(console.error)
  }, [pdfId, userId])

  const updateHighlightNote = useCallback((id: string, note: string) => {
    if (!pdfId || !userId) return
    setAnnotations((prev) => {
      const target = prev.find((a) => a.id === id && a.type === 'highlight')
      if (!target) return prev
      const updated = { ...target, note } as Annotation
      api.upsertAnnotation(pdfId, userId, updated).catch(console.error)
      return prev.map((a) => (a.id === id ? updated : a))
    })
  }, [pdfId, userId])

  const addNote = useCallback((content: string, pageNumber?: number) => {
    if (!pdfId || !userId) return
    const note: Annotation = {
      id: `note_${Date.now()}`,
      type: 'note',
      content,
      pageNumber,
      createdAt: new Date(),
    }
    setAnnotations((prev) => [...prev, note])
    api.upsertAnnotation(pdfId, userId, note).catch(console.error)
  }, [pdfId, userId])

  const updateNote = useCallback((id: string, content: string, pageNumber?: number) => {
    if (!pdfId || !userId) return
    setAnnotations((prev) => {
      const target = prev.find((a) => a.id === id && a.type === 'note')
      if (!target) return prev
      const updated = { ...target, content, ...(pageNumber !== undefined ? { pageNumber } : {}) } as Annotation
      api.upsertAnnotation(pdfId, userId, updated).catch(console.error)
      return prev.map((a) => (a.id === id ? updated : a))
    })
  }, [pdfId, userId])

  const removeAnnotation = useCallback((id: string) => {
    if (!pdfId || !userId) return
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
    api.deleteAnnotation(id).catch(console.error)
  }, [pdfId, userId])

  const addBookmark = useCallback((pageNumber: number, pageText?: string) => {
    if (!pdfId || !userId) return
    const existingBookmark = annotations.find(
      (a) => a.type === 'bookmark' && a.pageNumber === pageNumber
    )
    if (existingBookmark) {
      setAnnotations((prev) => prev.filter((a) => a.id !== existingBookmark.id))
      api.deleteAnnotation(existingBookmark.id).catch(console.error)
    } else {
      const bookmark: Annotation = {
        id: `bookmark_${Date.now()}`,
        type: 'bookmark',
        pageNumber,
        ...(pageText ? { pageText } : {}),
        createdAt: new Date(),
      }
      setAnnotations((prev) => [...prev, bookmark])
      api.upsertAnnotation(pdfId, userId, bookmark).catch(console.error)
    }
  }, [pdfId, userId, annotations])

  const clearAllAnnotations = useCallback(() => {
    if (!pdfId || !userId) return
    setAnnotations([])
    api.saveAnnotations(pdfId, userId, []).catch(console.error)
  }, [pdfId, userId])

  return {
    annotations,
    addHighlight,
    updateHighlightNote,
    addNote,
    updateNote,
    addBookmark,
    removeAnnotation,
    clearAllAnnotations,
  }
}
