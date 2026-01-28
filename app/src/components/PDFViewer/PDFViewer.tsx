import { useState, useCallback, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import type { PDFDocument } from '@/types'
import { PageNavigation } from './PageNavigation'
import { SelectionActions } from './SelectionActions'
import { HighlightOverlay } from './HighlightOverlay'
import { HighlightNoteModal } from './HighlightNoteModal'
import { DictionaryPopup } from './DictionaryPopup'
import { dictionaryService, type DictionaryDefinition } from '@/services/dictionary/dictionaryService'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

interface PDFViewerProps {
  pdf: PDFDocument | null
  onTextSelect?: (text: string, pageNumber: number, position: { x: number; y: number }) => void
  onHighlight?: (text: string, pageNumber: number, note?: string, coordinates?: { x: number; y: number; width: number; height: number }) => void
  onSendToLLM?: (text: string) => void
  highlights?: Array<{ id: string; pageNumber: number; text: string; coordinates?: { x: number; y: number; width: number; height: number } }>
  currentPage?: number
  onPageChange?: (page: number) => void
  onNavigateToPage?: (pageNumber: number) => void
  onScaleChange?: (scale: number) => void
  onNumPagesChange?: (numPages: number) => void
  scale?: number
  onBookmark?: (pageNumber: number) => void
  isBookmarked?: boolean
  onPageDimensionsChange?: (dimensions: { width: number; height: number } | null) => void
  containerRef?: React.RefObject<HTMLDivElement>
}

export function PDFViewer({ pdf, onTextSelect, onHighlight, onSendToLLM, highlights = [], currentPage, onPageChange, onScaleChange: _onScaleChange, onNumPagesChange, scale: externalScale, onBookmark, isBookmarked, onPageDimensionsChange, containerRef: externalContainerRef }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [_internalScale, _setInternalScale] = useState<number>(1.0)
  const scale = externalScale !== undefined ? externalScale : _internalScale
  
  useEffect(() => {
    if (currentPage !== undefined && currentPage !== pageNumber) {
      setPageNumber(currentPage)
    }
  }, [currentPage, pageNumber])
  
  // Scale is controlled externally if externalScale is provided
  // Internal scale state is only used when externalScale is undefined
  const [selectedText, setSelectedText] = useState<{ text: string; pageNumber: number; position: { x: number; y: number }; coordinates?: { x: number; y: number; width: number; height: number } } | null>(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [pendingHighlight, setPendingHighlight] = useState<{ text: string; pageNumber: number; coordinates?: { x: number; y: number; width: number; height: number } } | null>(null)
  const [dictionaryState, setDictionaryState] = useState<{
    word: string
    position: { x: number; y: number }
    definitions: DictionaryDefinition[] | null
    isLoading: boolean
    error: string | null
  } | null>(null)
  const internalContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = externalContainerRef || internalContainerRef
  const lastPageHeightRef = useRef<number | null>(null)
  const lastPageWidthRef = useRef<number | null>(null)
  const [isPageRendered, setIsPageRendered] = useState<boolean>(false)
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set())
  const renderedPagesRef = useRef<Set<number>>(new Set())
  const navBarRef = useRef<HTMLDivElement>(null)
  const [navBarHeight, setNavBarHeight] = useState<number>(0)

  useEffect(() => {
    if (pdf) {
      setPageNumber(1)
      setNumPages(0)
      setSelectedText(null)
      setPendingHighlight(null)
      lastPageHeightRef.current = null
      lastPageWidthRef.current = null
      setIsPageRendered(false)
      setPreloadedPages(new Set())
      renderedPagesRef.current.clear()
      if (onPageDimensionsChange) {
        onPageDimensionsChange(null)
      }
    }
  }, [pdf, onPageDimensionsChange])

  // Reset render state when page changes (unless page is already rendered from preload)
  useEffect(() => {
    if (renderedPagesRef.current.has(pageNumber)) {
      // Page was preloaded, show it immediately
      setIsPageRendered(true)
    } else {
      // Page not preloaded, wait for render
      setIsPageRendered(false)
    }
  }, [pageNumber])

  // Preload next and previous pages
  useEffect(() => {
    if (!numPages || pageNumber < 1) return

    const pagesToPreload = new Set<number>()
    
    // Preload next page
    if (pageNumber < numPages) {
      pagesToPreload.add(pageNumber + 1)
    }
    
    // Preload previous page
    if (pageNumber > 1) {
      pagesToPreload.add(pageNumber - 1)
    }

    setPreloadedPages(pagesToPreload)
  }, [pageNumber, numPages])

  // Hide canvas until page is fully rendered, and hide preloaded pages
  useEffect(() => {
    const updateCanvasVisibility = (pageNum: number, isVisible: boolean) => {
      const wrapper = document.getElementById(`pdf-page-wrapper-${pageNum}`)
      if (!wrapper) return

      const canvas = wrapper.querySelector('canvas')
      if (canvas) {
        const isRendered = renderedPagesRef.current.has(pageNum)
        if (isVisible && isRendered) {
          canvas.style.visibility = 'visible'
          canvas.style.opacity = '1'
          canvas.style.pointerEvents = ''
        } else {
          canvas.style.visibility = 'hidden'
          canvas.style.opacity = '0'
          canvas.style.pointerEvents = 'none'
        }
      }
    }

    // Update current page visibility (show if rendered)
    const isCurrentPageRendered = renderedPagesRef.current.has(pageNumber)
    updateCanvasVisibility(pageNumber, isCurrentPageRendered)

    // Hide preloaded pages
    preloadedPages.forEach((pageNum) => {
      updateCanvasVisibility(pageNum, false)
    })

    // Watch for canvas being added
    const allPages = [pageNumber, ...Array.from(preloadedPages)]
    const observers: MutationObserver[] = []
    const intervals: ReturnType<typeof setInterval>[] = []

    allPages.forEach((pageNum) => {
      const wrapper = document.getElementById(`pdf-page-wrapper-${pageNum}`)
      if (wrapper) {
        const observer = new MutationObserver(() => {
          const isVisible = pageNum === pageNumber && renderedPagesRef.current.has(pageNum)
          updateCanvasVisibility(pageNum, isVisible)
        })
        observer.observe(wrapper, { childList: true, subtree: true })
        observers.push(observer)

        const interval = setInterval(() => {
          const isVisible = pageNum === pageNumber && renderedPagesRef.current.has(pageNum)
          updateCanvasVisibility(pageNum, isVisible)
        }, 10)
        intervals.push(interval)
      }
    })

    return () => {
      observers.forEach(obs => obs.disconnect())
      intervals.forEach(int => clearInterval(int))
    }
  }, [pageNumber, isPageRendered, preloadedPages])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    onNumPagesChange?.(numPages)
  }, [onNumPagesChange])

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page)
      onPageChange?.(page)
    }
  }, [numPages, onPageChange, pageNumber])

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim()
      const range = selection.getRangeAt(0)
      
      // Find the PDF page wrapper and text layer elements
      const pageWrapper = document.getElementById(`pdf-page-wrapper-${pageNumber}`)
      if (!pageWrapper || !containerRef.current) {
        setSelectedText(null)
        return
      }
      
      const pageElement = pageWrapper.querySelector('.react-pdf__Page')
      const textLayer = pageElement?.querySelector('.react-pdf__Page__textContent') as HTMLElement
      
      if (!textLayer) {
        setSelectedText(null)
        return
      }
      
      // Use getClientRects() to get accurate bounding boxes for multi-line selections
      // getBoundingClientRect() returns a rectangle spanning full container width for multi-line text
      const clientRects = range.getClientRects()
      
      // Filter out invalid rectangles (zero width/height or collapsed ranges)
      // These can occur with certain text selections and cause incorrect bounding box calculations
      const validRects = Array.from(clientRects).filter(rect => 
        rect.width > 0 && rect.height > 0 && rect.right > rect.left && rect.bottom > rect.top
      )
      
      if (validRects.length === 0) {
        setSelectedText(null)
        return
      }
      
      // Get the text layer's position relative to viewport
      const textLayerRect = textLayer.getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()
      
      // Store individual rectangles for each line of the selection
      // This allows us to render highlights accurately for multi-line selections
      const rects = validRects.map(rect => ({
        x: (rect.left - textLayerRect.left) / scale,
        y: (rect.top - textLayerRect.top) / scale,
        width: rect.width / scale,
        height: rect.height / scale,
      }))
      
      // Calculate overall bounding box for backward compatibility and positioning
      let minLeft = Infinity
      let minTop = Infinity
      let maxRight = -Infinity
      let maxBottom = -Infinity
      
      for (let i = 0; i < validRects.length; i++) {
        const rect = validRects[i]
        minLeft = Math.min(minLeft, rect.left)
        minTop = Math.min(minTop, rect.top)
        maxRight = Math.max(maxRight, rect.right)
        maxBottom = Math.max(maxBottom, rect.bottom)
      }
      
      // Calculate coordinates relative to the text layer (which is positioned within the page)
      // Store both the overall bounding box and individual rects for multi-line rendering
      const coordinates = {
        x: (minLeft - textLayerRect.left) / scale,
        y: (minTop - textLayerRect.top) / scale,
        width: (maxRight - minLeft) / scale,
        height: (maxBottom - minTop) / scale,
        rects: rects, // Store individual rectangles for accurate multi-line rendering
      }
      
      // Position for the selection actions popup (relative to container)
      const position = {
        x: minLeft - containerRect.left + (maxRight - minLeft) / 2,
        y: minTop - containerRect.top,
      }
      
      setSelectedText({ text, pageNumber, position, coordinates })
      onTextSelect?.(text, pageNumber, position)
    } else {
      setSelectedText(null)
    }
  }, [pageNumber, onTextSelect, scale, containerRef])

  const handleHighlight = useCallback(() => {
    if (selectedText) {
      // Capture selectedText when opening modal to avoid it being cleared
      setPendingHighlight({
        text: selectedText.text,
        pageNumber: selectedText.pageNumber,
        coordinates: selectedText.coordinates,
      })
      setShowNoteModal(true)
    }
  }, [selectedText])

  const handleNoteSave = useCallback((note: string | undefined) => {
    // Use pendingHighlight which was captured when modal opened
    if (pendingHighlight && onHighlight) {
      // Save the highlight
      onHighlight(pendingHighlight.text, pendingHighlight.pageNumber, note, pendingHighlight.coordinates)
      // Clear selection and close modal
      setSelectedText(null)
      setPendingHighlight(null)
      setShowNoteModal(false)
      window.getSelection()?.removeAllRanges()
    } else {
      // If pendingHighlight is somehow null or onHighlight is missing, still close the modal
      console.warn('Cannot save highlight: pendingHighlight or onHighlight is missing', { pendingHighlight, onHighlight })
      setPendingHighlight(null)
      setShowNoteModal(false)
    }
  }, [pendingHighlight, onHighlight])

  const handleNoteCancel = useCallback(() => {
    setShowNoteModal(false)
    // Don't save the highlight if user cancels
    // Keep selectedText so user can try again or use other actions
  }, [])

  const handleSendToLLM = useCallback(() => {
    if (selectedText) {
      onSendToLLM?.(selectedText.text)
      setSelectedText(null)
      window.getSelection()?.removeAllRanges()
    }
  }, [selectedText, onSendToLLM])

  const handleCloseSelection = useCallback(() => {
    setSelectedText(null)
    setDictionaryState(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  const handleDictionary = useCallback(async () => {
    if (selectedText) {
      const word = selectedText.text.trim()
      const position = selectedText.position
      
      // Show loading state
      setDictionaryState({
        word,
        position,
        definitions: null,
        isLoading: true,
        error: null,
      })

      try {
        const definitions = await dictionaryService.lookupWord(word)
        setDictionaryState({
          word,
          position,
          definitions,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        setDictionaryState({
          word,
          position,
          definitions: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch definition',
        })
      }
    }
  }, [selectedText])

  const handleCloseDictionary = useCallback(() => {
    setDictionaryState(null)
  }, [])

  const handleWikipedia = useCallback(() => {
    if (selectedText) {
      const query = encodeURIComponent(selectedText.text.trim())
      const wikipediaUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${query}`
      window.open(wikipediaUrl, '_blank', 'noopener,noreferrer')
      setSelectedText(null)
      window.getSelection()?.removeAllRanges()
    }
  }, [selectedText])

  if (!pdf) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">No PDF loaded</p>
      </div>
    )
  }

  // Measure navigation bar height
  useEffect(() => {
    if (navBarRef.current) {
      const height = navBarRef.current.getBoundingClientRect().height
      setNavBarHeight(height)
    }
  }, [])

  // Measure container dimensions for debugging
  useEffect(() => {
    if (!containerRef.current) return
    const scrollableContainer = containerRef.current.querySelector('.flex-1') as HTMLElement
    const pageWrapper = document.getElementById(`pdf-page-wrapper-${pageNumber}`)
    if (scrollableContainer && pageWrapper) {
    }
  }, [pageNumber, containerRef, isPageRendered])

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 relative overflow-hidden" ref={containerRef}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 relative min-h-0" style={{ display: 'flex', flexDirection: 'column' }} onMouseUp={handleTextSelection}>
        <div style={{ height: '10px', flexShrink: 0 }} />
        <div className="relative" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: '1 1 auto', minHeight: 0, margin: 0, padding: 0 }}>
          <Document
            file={pdf.url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
            error={
              <div className="flex items-center justify-center h-96">
                <p className="text-red-500 dark:text-red-400">Failed to load PDF</p>
              </div>
            }
          >
            {/* Current page */}
            <div 
              className="relative"
              id={`pdf-page-wrapper-${pageNumber}`}
              style={{ margin: 0, padding: 0 }}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={null}
                onRenderSuccess={(page) => {
                  lastPageHeightRef.current = page.height
                  lastPageWidthRef.current = page.width
                  renderedPagesRef.current.add(pageNumber)
                  setIsPageRendered(true)
                  // Notify parent of page dimensions at BASE scale (scale 1.0)
                  // page.width and page.height are at current scale, so we need to divide by scale to get base dimensions
                  // Or use originalWidth/originalHeight if available
                  if (onPageDimensionsChange) {
                    const baseWidth = (page as any).originalWidth ?? (page.width / scale)
                    const baseHeight = (page as any).originalHeight ?? (page.height / scale)
                    onPageDimensionsChange({ width: baseWidth, height: baseHeight })
                  }
                }}
                onRenderError={() => {
                  renderedPagesRef.current.add(pageNumber)
                  setIsPageRendered(true)
                }}
              />
              <HighlightOverlay
                highlights={highlights}
                currentPage={pageNumber}
                scale={scale}
              />
            </div>

            {/* Preloaded pages (hidden) */}
            {Array.from(preloadedPages).map((preloadPageNum) => (
              <div
                key={`preload-${preloadPageNum}`}
                className="relative"
                id={`pdf-page-wrapper-${preloadPageNum}`}
                style={{
                  position: 'absolute',
                  visibility: 'hidden',
                  pointerEvents: 'none',
                  top: 0,
                  left: 0,
                  width: 0,
                  height: 0,
                  overflow: 'hidden',
                }}
              >
                <Page
                  pageNumber={preloadPageNum}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={null}
                  onRenderSuccess={() => {
                    renderedPagesRef.current.add(preloadPageNum)
                  }}
                />
              </div>
            ))}
          </Document>
        </div>
        <div style={{ height: `${10 + navBarHeight}px`, flexShrink: 0 }} />
        
        {selectedText && (
          <SelectionActions
            selectedText={selectedText.text}
            position={selectedText.position}
            onHighlight={handleHighlight}
            onSendToLLM={handleSendToLLM}
            onDictionary={handleDictionary}
            onWikipedia={handleWikipedia}
            onClose={handleCloseSelection}
          />
        )}

        {dictionaryState && (
          <DictionaryPopup
            word={dictionaryState.word}
            position={dictionaryState.position}
            definitions={dictionaryState.definitions}
            isLoading={dictionaryState.isLoading}
            error={dictionaryState.error}
            onClose={handleCloseDictionary}
          />
        )}
      </div>

      <HighlightNoteModal
        isOpen={showNoteModal}
        onSave={handleNoteSave}
        onCancel={handleNoteCancel}
      />

      <div ref={navBarRef} className="absolute bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900">
        <PageNavigation
          pageNumber={pageNumber}
          numPages={numPages}
          onPageChange={goToPage}
          onBookmark={onBookmark}
          isBookmarked={isBookmarked}
        />
      </div>
    </div>
  )
}
