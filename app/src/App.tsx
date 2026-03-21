import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { usePDF } from '@/hooks/usePDF'
import { useAnnotations } from '@/hooks/useAnnotations'
import { useCanvas } from '@/hooks/useCanvas'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { PDFViewer } from '@/components/PDFViewer/PDFViewer'
import { PDFToolbar } from '@/components/PDFViewer/PDFToolbar'
import { NotesPanel } from '@/components/NotesPanel/NotesPanel'
import { ResizeHandle } from '@/components/ResizeHandle/ResizeHandle'
import { exportToMarkdown, downloadMarkdown, exportToText, downloadText, exportToPDF, downloadPDF } from '@/utils/export'
import { storageService } from '@/services/storage/storageService'
import { extractPageText } from '@/utils/pdfTextExtractor'
import { AlertModal } from '@/components/AlertModal/AlertModal'
import * as supabaseService from '@/services/api/apiService'
import type { BookRow } from '@/services/api/types'

interface AppProps {
  bookId: string
  book: BookRow
  pdfUrl: string
}

function App({ bookId, book, pdfUrl }: AppProps) {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { pdf, loadPDFFromUrl } = usePDF()
  const pdfId = bookId
  const { annotations, addHighlight, updateHighlightNote, addNote, removeAnnotation, clearAllAnnotations, addBookmark } = useAnnotations(pdfId, userId)
  const { canvasContent, updateCanvasContent } = useCanvas(pdfId, userId)
  const [_selectedText, setSelectedText] = useState<{ text: string; pageNumber: number } | null>(null)
  const [quotedText, setQuotedText] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'canvas'>('notes')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false)
  const [scale, setScale] = useState<number>(1.5)
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const handleNumPagesChange = useCallback((n: number) => {
    setNumPages(n)
    // Persist to Supabase if not already stored
    if (n > 0 && !book.num_pages) {
      supabaseService.updateBook(bookId, { num_pages: n }).catch(() => {})
    }
  }, [bookId, book.num_pages])
  const [documentMetadata, _setDocumentMetadata] = useState<{ title: string; author: string | null } | null>(
    { title: book.title, author: book.author }
  )

  // Auto-load the PDF from signed URL on mount
  useEffect(() => {
    if (!pdf && pdfUrl) {
      loadPDFFromUrl(pdfUrl)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [furthestPage, setFurthestPage] = useState<number | null>(null)
  const [lastPageRead, setLastPageRead] = useState<number | null>(null)
  const [currentPageText, setCurrentPageText] = useState<string>('')
  const pageTextCache = useRef<Map<number, string>>(new Map())
  const [sidebarWidth, setSidebarWidth] = useState<number>(384)
  const sidebarWidthDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number } | null>(null)
  const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string; variant?: 'error' | 'warning' | 'info' | 'success' }>({
    isOpen: false,
    message: '',
    variant: 'warning',
  })

  // Calculate fit scale based on available container dimensions and PDF page dimensions
  // Reserved for future use with handleFitPage
  // const calculateFitScale = useCallback((
  //   pdfPageWidth: number,
  //   pdfPageHeight: number,
  //   containerWidth: number,
  //   containerHeight: number,
  //   horizontalPadding: number = 32, // px-4 = 16px each side
  //   verticalPadding: number = 8     // Minimal padding for top/bottom (4px each)
  // ): number => {
  //   const availableWidth = containerWidth - horizontalPadding
  //   const availableHeight = containerHeight - verticalPadding
  //   
  //   // Calculate scale to fit width
  //   const scaleToFitWidth = availableWidth / pdfPageWidth
  //   // Calculate scale to fit height
  //   const scaleToFitHeight = availableHeight / pdfPageHeight
  //   
  //   // Use the smaller scale to ensure PDF fits in both dimensions
  //   const scale = Math.min(scaleToFitWidth, scaleToFitHeight)
  //   
  //   // Clamp between 0.5x and 3.0x
  //   return Math.min(Math.max(scale, 0.5), 3.0)
  // }, [])

  // Calculate fit width scale
  const calculateFitWidthScale = useCallback((
    pdfPageWidth: number,
    containerWidth: number,
    horizontalPadding: number = 32
  ): number => {
    const availableWidth = containerWidth - horizontalPadding
    const scale = availableWidth / pdfPageWidth
    return Math.min(Math.max(scale, 0.5), 3.0)
  }, [])

  // Handle fit to viewport (fit page) - reserved for future use
  // const handleFitPage = useCallback(() => {
  //   if (!containerDimensions || !pageDimensions) {
  //     setScale(1.0)
  //     return
  //   }
  //   
  //   const fitScale = calculateFitScale(
  //     pageDimensions.width,
  //     pageDimensions.height,
  //     containerDimensions.width,
  //     containerDimensions.height
  //   )
  //   setScale(fitScale)
  // }, [pageDimensions, containerDimensions, calculateFitScale])

  // Handle fit width
  const handleFitWidth = useCallback(() => {
    if (!containerDimensions || !pageDimensions) {
      setScale(1.0)
      return
    }
    
    const fitScale = calculateFitWidthScale(
      pageDimensions.width,
      containerDimensions.width
    )
    setScale(fitScale)
  }, [pageDimensions, containerDimensions, calculateFitWidthScale])

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3.0))
  }, [])

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.25))
  }, [])

  // Handle page dimensions change from PDFViewer
  const handlePageDimensionsChange = useCallback((dimensions: { width: number; height: number } | null) => {
    setPageDimensions(dimensions)
  }, [])

  // Handle container dimensions change from PDFViewer
  const handleContainerDimensionsChange = useCallback((dimensions: { width: number; height: number } | null) => {
    setContainerDimensions(dimensions)
  }, [])

  const handleTextSelect = useCallback((text: string, pageNumber: number, _position: { x: number; y: number }) => {
    setSelectedText({ text, pageNumber })
  }, [])

  const handleHighlight = useCallback((text: string, pageNumber: number, note?: string, coordinates?: { x: number; y: number; width: number; height: number }) => {
    addHighlight({ pageNumber, text, coordinates }, note)
    setSelectedText(null)
    setActiveTab('notes')
  }, [addHighlight])

  const handleHighlightClick = useCallback((highlightId: string) => {
    setSelectedAnnotationId(highlightId)
    setActiveTab('notes')
  }, [])

  const handleNavigateToPage = useCallback((pageNumber: number, isManualForward: boolean = false) => {
    if (isManualForward && pageNumber > currentPage) {
      isManualForwardNavigationRef.current = true
    } else {
      isManualForwardNavigationRef.current = false
    }

    setCurrentPage(pageNumber)

    // Update furthest page if navigating forward
    if (pageNumber > (furthestPage ?? 0)) {
      setFurthestPage(pageNumber)
    }

    // Update last page read for manual forward navigation
    if (isManualForward && pageNumber > currentPage) {
      setLastPageRead(pageNumber)
    }

    setTimeout(() => {
      isManualForwardNavigationRef.current = false
    }, 100)
  }, [currentPage, furthestPage])

  const handleSendToLLM = useCallback((text: string) => {
    setQuotedText(text)
    setActiveTab('chat')
  }, [])

  // Clear page text cache when PDF changes
  useEffect(() => {
    if (!pdf) {
      pageTextCache.current.clear()
      setCurrentPageText('')
    }
  }, [pdf])

  const handleQuotedTextClear = useCallback(() => {
    setQuotedText(null)
  }, [])

  const handleClearChat = useCallback(() => {
    setChatMessages([])
    setQuotedText(null)
    if (pdfId && userId) {
      supabaseService.saveChatMessages(pdfId, userId, []).catch(console.warn)
    }
  }, [pdfId, userId])

  const handleSaveInsight = useCallback((text: string) => {
    // Save insight as a blue highlight with pageNumber 0 to indicate it's from chat
    addHighlight({ pageNumber: 0, text }, undefined, 'blue')
    // Switch to highlights tab to show the saved insight
    setActiveTab('notes')
  }, [addHighlight])

  const handleExport = useCallback((format: 'markdown' | 'pdf' | 'txt') => {
    if (annotations.length === 0) {
      setAlertState({
        isOpen: true,
        message: 'No annotations to export',
        variant: 'warning',
      })
      return
    }

    const baseName = book.filename.replace('.pdf', '') || 'notes'
    const metadata = documentMetadata ? { title: documentMetadata.title, author: documentMetadata.author } : undefined

    if (format === 'markdown') {
      const markdown = exportToMarkdown(annotations, metadata)
      downloadMarkdown(markdown, `${baseName}_notes.md`)
    } else if (format === 'txt') {
      const text = exportToText(annotations, metadata)
      downloadText(text, `${baseName}_notes.txt`)
    } else if (format === 'pdf') {
      exportToPDF(annotations, metadata).then((blob) => {
        downloadPDF(blob, `${baseName}_notes.pdf`)
      })
    }
  }, [annotations, documentMetadata, book.filename])

  // Debounce timer refs for UI state
  const uiStateDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const isAutoSyncingRef = useRef<boolean>(false)
  const previousFurthestPageRef = useRef<number | null>(null)
  const isManualForwardNavigationRef = useRef<boolean>(false)

  // Load persisted data from Supabase when book loads
  useEffect(() => {
    if (!pdfId || !userId) return

    const loadPersistedData = async () => {
      try {
        const [progress, savedMessages] = await Promise.all([
          supabaseService.getReadingProgress(pdfId),
          supabaseService.getChatMessages(pdfId),
        ])

        if (progress) {
          isManualForwardNavigationRef.current = false
          // Set ref before state so auto-sync effect doesn't treat loaded value as new
          previousFurthestPageRef.current = progress.furthestPage
          setCurrentPage(progress.currentPage)
          setScale(progress.scale)
          setFurthestPage(progress.furthestPage)
          setLastPageRead(progress.lastPageRead)
        }

        if (savedMessages.length > 0) {
          setChatMessages(savedMessages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            quotedText: m.quotedText,
          })))
        }
      } catch (error) {
        console.warn('Failed to load persisted data from Supabase:', error)
      }
    }

    loadPersistedData()
  }, [pdfId, userId])

  // Load global UI state on mount
  useEffect(() => {
    const savedGlobalState = storageService.getGlobalUIState()
    if (savedGlobalState) {
      setActiveTab(savedGlobalState.activeTab)
      setIsPanelCollapsed(savedGlobalState.isPanelCollapsed)
    }
    
    // Load sidebar width preference
    const savedWidth = storageService.getSidebarWidth()
    setSidebarWidth(savedWidth)
  }, [])




  const handleNewChatMessages = useCallback((newMessages: Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>) => {
    if (!pdfId || !userId) return
    supabaseService.insertChatMessages(pdfId, userId, newMessages).catch(
      (err) => console.warn('Failed to insert chat messages:', err)
    )
  }, [pdfId, userId])

  // Auto sync to furthest page when furthest page updates
  useEffect(() => {
    if (pdfId && furthestPage !== null && furthestPage > currentPage) {
      // Only auto-sync if furthest page was updated (not if it's the same)
      if (previousFurthestPageRef.current !== furthestPage && !isAutoSyncingRef.current) {
        isAutoSyncingRef.current = true
        // Not manual forward navigation (programmatic sync)
        isManualForwardNavigationRef.current = false
        setCurrentPage(furthestPage)
        // Reset flag after a short delay
        setTimeout(() => {
          isAutoSyncingRef.current = false
        }, 100)
      }
      previousFurthestPageRef.current = furthestPage
    } else {
      previousFurthestPageRef.current = furthestPage
    }
  }, [pdfId, furthestPage, currentPage])

  // Save reading progress to Supabase with debouncing
  useEffect(() => {
    if (!pdfId || !userId) return

    if (uiStateDebounceRef.current) {
      clearTimeout(uiStateDebounceRef.current)
    }

    uiStateDebounceRef.current = setTimeout(() => {
      // Update furthest page if current page is greater
      const newFurthestPage = (furthestPage === null || currentPage > furthestPage) ? currentPage : furthestPage
      if (newFurthestPage !== furthestPage) {
        setFurthestPage(newFurthestPage)
      }

      // Update last page read for manual forward navigation
      const newLastPageRead = (isManualForwardNavigationRef.current && currentPage > (lastPageRead ?? 0))
        ? currentPage
        : lastPageRead

      if (newLastPageRead !== lastPageRead) {
        setLastPageRead(newLastPageRead)
      }

      supabaseService.updateReadingProgress(pdfId, {
        current_page: currentPage,
        scale,
        furthest_page: newFurthestPage ?? currentPage,
        last_page_read: newLastPageRead ?? currentPage,
      }).catch(err => console.warn('Failed to save reading progress:', err))
    }, 500)

    return () => {
      if (uiStateDebounceRef.current) {
        clearTimeout(uiStateDebounceRef.current)
      }
    }
  }, [pdfId, userId, currentPage, scale, lastPageRead, furthestPage])

  // Save global UI state when it changes
  useEffect(() => {
    storageService.saveGlobalUIState({
      activeTab,
      isPanelCollapsed,
    })
  }, [activeTab, isPanelCollapsed])

  // Handle sidebar resize with debouncing
  const handleSidebarResize = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth)
    
    // Debounce saving to localStorage
    if (sidebarWidthDebounceRef.current) {
      clearTimeout(sidebarWidthDebounceRef.current)
    }
    sidebarWidthDebounceRef.current = setTimeout(() => {
      storageService.saveSidebarWidth(newWidth)
    }, 300)
  }, [])

  // Calculate max width based on viewport (60% of window width)
  const getMaxSidebarWidth = useCallback(() => {
    return Math.min(800, Math.floor(window.innerWidth * 0.6))
  }, [])

  // Update sidebar width if window resizes and current width exceeds max
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = getMaxSidebarWidth()
      if (sidebarWidth > maxWidth) {
        setSidebarWidth(maxWidth)
        storageService.saveSidebarWidth(maxWidth)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarWidth, getMaxSidebarWidth])

  // Track if this is the initial load (for auto-fit on first render)
  const hasInitialFitRef = useRef<boolean>(false)

  // Calculate initial fit scale when PDF and container dimensions become available (only on first load)
  // Default to fit to width
  useEffect(() => {
    if (pageDimensions && containerDimensions && pdf && !hasInitialFitRef.current) {
      // Use requestAnimationFrame to ensure layout is complete before calculating fit
      const rafId = requestAnimationFrame(() => {
        handleFitWidth()
        hasInitialFitRef.current = true
      })
      return () => cancelAnimationFrame(rafId)
    }
  }, [pageDimensions, containerDimensions, pdf, handleFitWidth])

  // Reset initial fit flag when PDF changes
  useEffect(() => {
    if (!pdf) {
      hasInitialFitRef.current = false
    }
  }, [pdf])

  // Extract page text when page changes
  useEffect(() => {
    if (pdf && currentPage > 0) {
      // Check cache first
      const cachedText = pageTextCache.current.get(currentPage)
      if (cachedText !== undefined) {
        setCurrentPageText(cachedText)
        return
      }

      // Extract text if not cached
      extractPageText(pdf.url, currentPage)
        .then((text) => {
          pageTextCache.current.set(currentPage, text)
          setCurrentPageText(text)
        })
        .catch((error) => {
          console.error('Failed to extract page text:', error)
          setCurrentPageText('')
        })
    } else {
      setCurrentPageText('')
    }
  }, [pdf, currentPage])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNextPage: () => {
      if (currentPage < numPages) {
        const nextPage = currentPage + 1
        isManualForwardNavigationRef.current = true
        setCurrentPage(nextPage)
        if (nextPage > (furthestPage ?? 0)) {
          setFurthestPage(nextPage)
        }
        setLastPageRead(nextPage)
        setTimeout(() => {
          isManualForwardNavigationRef.current = false
        }, 600)
      }
    },
    onPreviousPage: () => {
      if (currentPage > 1) {
        const prevPage = currentPage - 1
        isManualForwardNavigationRef.current = false
        setCurrentPage(prevPage)
        setLastPageRead(prevPage)
      }
    },
    onCloseSelection: () => {
      setSelectedText(null)
    },
    onTogglePanel: () => {
      setIsPanelCollapsed(prev => !prev)
    },
    onNavigateToTab: (tab) => {
      if (activeTab === tab) {
        if (isPanelCollapsed) {
          setIsPanelCollapsed(false)
        } else {
          setIsPanelCollapsed(true)
        }
      } else {
        setActiveTab(tab)
        if (isPanelCollapsed) {
          setIsPanelCollapsed(false)
        }
      }
    },
    enabled: !!pdf,
  })

  // Handle page change from toolbar
  const handleToolbarPageChange = useCallback((page: number) => {
    const isForward = page > currentPage
    isManualForwardNavigationRef.current = isForward
    setCurrentPage(page)

    if (isForward) {
      if (page > (furthestPage ?? 0)) {
        setFurthestPage(page)
      }
      setLastPageRead(page)
    }

    setTimeout(() => {
      isManualForwardNavigationRef.current = false
    }, 600)
  }, [currentPage, furthestPage])

  // Handle sync to last page read
  const handleSyncLastPage = useCallback(() => {
    isManualForwardNavigationRef.current = false
    if (lastPageRead !== null) {
      setCurrentPage(lastPageRead)
    }
  }, [lastPageRead])

  // Handle sync to furthest page
  const handleSyncFurthestPage = useCallback(() => {
    isManualForwardNavigationRef.current = false
    if (furthestPage !== null) {
      setCurrentPage(furthestPage)
    }
  }, [furthestPage])

  if (!pdf) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-500 dark:text-gray-400">Loading PDF...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* PDF Area (toolbar + viewer) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Toolbar */}
        <PDFToolbar
          onClose={() => navigate('/library')}
          pdfFileName={book.filename}
          pageNumber={currentPage}
          numPages={numPages}
          onPageChange={handleToolbarPageChange}
          onBookmark={() => {
            addBookmark(currentPage, currentPageText || undefined)
            setActiveTab('notes')
          }}
          isBookmarked={annotations.some((a) => a.type === 'bookmark' && a.pageNumber === currentPage)}
          scale={scale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitWidth={handleFitWidth}
          onSyncLastPage={handleSyncLastPage}
          onSyncFurthestPage={handleSyncFurthestPage}
          lastPageRead={lastPageRead}
          furthestPage={furthestPage}
          hasUnsavedChanges={annotations.length > 0}
        />

        {/* PDF Content Area */}
        <div className="flex-1 min-h-0">
          <PDFViewer
            pdf={pdf}
            onTextSelect={handleTextSelect}
            onHighlight={handleHighlight}
            onSendToLLM={handleSendToLLM}
            highlights={annotations.filter((a): a is Extract<typeof a, { type: 'highlight' }> => a.type === 'highlight')}
            onNavigateToPage={handleNavigateToPage}
            currentPage={currentPage}
            onPageChange={handleToolbarPageChange}
            onPageDimensionsChange={handlePageDimensionsChange}
            onContainerDimensionsChange={handleContainerDimensionsChange}
            onNumPagesChange={handleNumPagesChange}
            scale={scale}
            onScaleChange={setScale}
            onHighlightClick={handleHighlightClick}
            selectedHighlightId={selectedAnnotationId}
          />
        </div>
      </div>
      
      {/* Notes Panel - full height */}
      <div 
        className="flex-shrink-0 relative h-full bg-white dark:bg-gray-900"
        style={{ 
          width: isPanelCollapsed ? '48px' : `${sidebarWidth}px`, 
          transition: 'width 0.2s ease-out' 
        }}
      >
        {!isPanelCollapsed && (
          <ResizeHandle 
            onResize={handleSidebarResize}
            minWidth={250}
            maxWidth={getMaxSidebarWidth()}
          />
        )}
        <NotesPanel
          annotations={annotations}
          onAddNote={(content, pageNumber) => {
            addNote(content, pageNumber)
            setActiveTab('notes')
          }}
          onRemoveAnnotation={removeAnnotation}
          onClearAll={clearAllAnnotations}
          onExport={handleExport}
          quotedText={quotedText}
          onQuotedTextClear={handleQuotedTextClear}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNavigateToPage={handleNavigateToPage}
          onUpdateHighlightNote={(id, note) => {
            updateHighlightNote(id, note)
            setActiveTab('notes')
          }}
          chatMessages={chatMessages}
          onChatMessagesChange={setChatMessages}
          documentMetadata={documentMetadata}
          currentPage={currentPage}
          currentPageText={currentPageText}
          numPages={numPages}
          pdfUrl={pdf?.url}
          onSaveInsight={handleSaveInsight}
          onClearChat={handleClearChat}
          onNewChatMessages={handleNewChatMessages}
          isCollapsed={isPanelCollapsed}
          onToggleCollapsed={() => setIsPanelCollapsed(!isPanelCollapsed)}
          canvasContent={canvasContent}
          onCanvasContentChange={updateCanvasContent}
          selectedAnnotationId={selectedAnnotationId}
          onClearSelectedAnnotation={() => setSelectedAnnotationId(null)}
        />
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertState.isOpen}
        message={alertState.message}
        variant={alertState.variant}
        onClose={() => setAlertState({ isOpen: false, message: '', variant: 'warning' })}
      />
    </div>
  )
}

export default App
