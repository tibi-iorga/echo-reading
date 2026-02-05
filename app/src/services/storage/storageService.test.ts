import { describe, it, expect, beforeEach, vi } from 'vitest'
import { storageService } from './storageService'
import type { Annotation } from '@/types'

// Mock secureKeyStorage
vi.mock('./secureKeyStorage', () => ({
  getApiKey: vi.fn().mockResolvedValue(null),
  setApiKey: vi.fn().mockResolvedValue(undefined),
  removeApiKey: vi.fn().mockResolvedValue(undefined),
  hasApiKey: vi.fn().mockResolvedValue(false),
  initializeSecureStorage: vi.fn().mockResolvedValue(undefined),
  isInFallbackMode: vi.fn().mockReturnValue(false),
}))

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Provider management', () => {
    it('should get and set provider', () => {
      expect(storageService.getProvider()).toBeNull()
      storageService.setProvider('OpenAI')
      expect(storageService.getProvider()).toBe('OpenAI')
    })
  })

  describe('Annotations', () => {
    const pdfId = 'test-pdf-123'
    const mockAnnotation: Annotation = {
      id: 'highlight_1',
      type: 'highlight',
      pageNumber: 1,
      text: 'Test text',
      createdAt: new Date(),
    }

    it('should return empty array when no annotations exist', () => {
      expect(storageService.getAnnotations(pdfId)).toEqual([])
    })

    it('should save and retrieve annotations', async () => {
      await storageService.saveAnnotations(pdfId, [mockAnnotation])
      const retrieved = storageService.getAnnotations(pdfId)
      expect(retrieved).toHaveLength(1)
      expect(retrieved[0].id).toBe(mockAnnotation.id)
    })

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem(`pdf_annotations_${pdfId}`, 'invalid json')
      expect(storageService.getAnnotations(pdfId)).toEqual([])
    })
  })

  describe('Document metadata', () => {
    const pdfId = 'test-pdf-123'
    const metadata = { title: 'Test Book', author: 'Test Author' }

    it('should return null when no metadata exists', () => {
      expect(storageService.getDocumentMetadata(pdfId)).toBeNull()
    })

    it('should save and retrieve metadata', () => {
      storageService.setDocumentMetadata(pdfId, metadata)
      const retrieved = storageService.getDocumentMetadata(pdfId)
      expect(retrieved).toEqual(metadata)
    })

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem(`pdf_document_metadata_${pdfId}`, 'invalid json')
      expect(storageService.getDocumentMetadata(pdfId)).toBeNull()
    })
  })

  describe('UI State', () => {
    const pdfId = 'test-pdf-123'
    const uiState = { currentPage: 5, scale: 1.5 }

    it('should return null when no UI state exists', () => {
      expect(storageService.getUIState(pdfId)).toBeNull()
    })

    it('should save and retrieve UI state', () => {
      storageService.saveUIState(pdfId, uiState)
      const retrieved = storageService.getUIState(pdfId)
      expect(retrieved).toEqual(uiState)
    })

    it('should handle versioned UI state', () => {
      const versionedData = {
        version: 1,
        currentPage: 5,
        scale: 1.5,
      }
      localStorage.setItem(
        `pdf_ui_state_${pdfId}`,
        JSON.stringify(versionedData),
      )
      const retrieved = storageService.getUIState(pdfId)
      expect(retrieved).toEqual(uiState)
    })
  })

  describe('Furthest page', () => {
    const pdfId = 'test-pdf-123'

    it('should return null when no furthest page exists', () => {
      expect(storageService.getFurthestPage(pdfId)).toBeNull()
    })

    it('should save and retrieve furthest page', async () => {
      await storageService.saveFurthestPage(pdfId, 10)
      expect(storageService.getFurthestPage(pdfId)).toBe(10)
    })

    it('should handle invalid page number gracefully', () => {
      localStorage.setItem(`pdf_furthest_page_${pdfId}`, 'invalid')
      expect(storageService.getFurthestPage(pdfId)).toBeNull()
    })
  })

  describe('Last page read', () => {
    const pdfId = 'test-pdf-123'

    it('should return null when no last page read exists', () => {
      expect(storageService.getLastPageRead(pdfId)).toBeNull()
    })

    it('should save and retrieve last page read', async () => {
      await storageService.saveLastPageRead(pdfId, 5)
      expect(storageService.getLastPageRead(pdfId)).toBe(5)
    })
  })

  describe('Sidebar width', () => {
    it('should return default width when not set', () => {
      expect(storageService.getSidebarWidth()).toBe(384)
    })

    it('should save and retrieve sidebar width', () => {
      storageService.saveSidebarWidth(500)
      expect(storageService.getSidebarWidth()).toBe(500)
    })

    it('should handle invalid width gracefully', () => {
      localStorage.setItem('sidebar_width', 'invalid')
      expect(storageService.getSidebarWidth()).toBe(384)
    })
  })

  describe('Theme', () => {
    it('should return null when no theme is set', () => {
      expect(storageService.getTheme()).toBeNull()
    })

    it('should save and retrieve theme', () => {
      storageService.saveTheme('dark')
      expect(storageService.getTheme()).toBe('dark')
    })

    it('should only accept valid theme values', () => {
      localStorage.setItem('app_theme', 'invalid')
      expect(storageService.getTheme()).toBeNull()
    })
  })
})
