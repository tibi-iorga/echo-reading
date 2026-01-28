import { useState, useCallback, useEffect, useRef } from 'react'
import { usePDF } from '@/hooks/usePDF'
import { useAnnotations } from '@/hooks/useAnnotations'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { PDFViewer } from '@/components/PDFViewer/PDFViewer'
import { PDFControls } from '@/components/PDFViewer/PDFControls'
import { NotesPanel } from '@/components/NotesPanel/NotesPanel'
import { FileSelector } from '@/components/FileSelector/FileSelector'
import { OpenFileModal } from '@/components/OpenFileModal/OpenFileModal'
import { ResizeHandle } from '@/components/ResizeHandle/ResizeHandle'
import { exportToMarkdown, downloadMarkdown } from '@/utils/export'
// import { llmService } from '@/services/llm/llmService' // Unused
import { storageService } from '@/services/storage/storageService'
import { fileSyncService } from '@/services/fileSync/fileSyncService'
import { parseFilename } from '@/utils/filenameParser'
import { extractPageText } from '@/utils/pdfTextExtractor'

function App() {
  const { pdf, loadPDF, clearPDF } = usePDF()
  const pdfId = pdf ? `${pdf.file.name}_${pdf.file.size}` : null
  const { annotations, addHighlight, updateHighlightNote, addNote, removeAnnotation, clearAllAnnotations, addBookmark, reloadAnnotations } = useAnnotations(pdfId)
  const [_selectedText, setSelectedText] = useState<{ text: string; pageNumber: number } | null>(null)
  const [quotedText, setQuotedText] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'settings'>('chat')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false)
  const [scale, setScale] = useState<number>(1.5)
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>>([])
  const [numPages, setNumPages] = useState<number>(0)
  const [showOpenFileModal, setShowOpenFileModal] = useState(false)
  const [documentMetadata, setDocumentMetadata] = useState<{ title: string; author: string | null } | null>(null)
  const [furthestPage, setFurthestPage] = useState<number | null>(null)
  const [lastPageRead, setLastPageRead] = useState<number | null>(null)
  const [currentPageText, setCurrentPageText] = useState<string>('')
  const pageTextCache = useRef<Map<number, string>>(new Map())
  const [sidebarWidth, setSidebarWidth] = useState<number>(384)
  const sidebarWidthDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const handleTextSelect = useCallback((text: string, pageNumber: number, _position: { x: number; y: number }) => {
    setSelectedText({ text, pageNumber })
  }, [])

  const handleHighlight = useCallback((text: string, pageNumber: number, note?: string, coordinates?: { x: number; y: number; width: number; height: number }) => {
    addHighlight({ pageNumber, text, coordinates }, note)
    setSelectedText(null)
  }, [addHighlight])

  const handleNavigateToPage = useCallback(async (pageNumber: number, isManualForward: boolean = false) => {
    // Mark as manual forward navigation if navigating forward manually
    if (isManualForward && pageNumber > currentPage) {
      isManualForwardNavigationRef.current = true
    } else {
      isManualForwardNavigationRef.current = false
    }
    
    setCurrentPage(pageNumber)
    // Update furthest page if navigating forward
    // Check sync file first (source of truth) before updating
    if (pdfId && pageNumber > currentPage) {
      // Check sync file's furthest page
      let syncFileFurthestPage: number | null = null
      try {
        await fileSyncService.initialize()
        if (fileSyncService.hasSyncFile()) {
          const syncData = await fileSyncService.readSyncData()
          syncFileFurthestPage = syncData.furthestPage ?? null
        }
      } catch (error) {
        console.warn('Failed to check sync file for furthest page:', error)
      }
      
      // Use sync file value as source of truth, fall back to localStorage
      const currentFurthestPage = syncFileFurthestPage !== null ? syncFileFurthestPage : storageService.getFurthestPage(pdfId)
      
      // Only update if new page is greater than furthest page in sync file (or localStorage if no sync file)
      if (currentFurthestPage === null || pageNumber > currentFurthestPage) {
        await storageService.saveFurthestPage(pdfId, pageNumber)
        setFurthestPage(pageNumber)
      }
    }
    // Update last page read only for manual forward navigation
    if (pdfId && isManualForward && pageNumber > currentPage) {
      storageService.saveLastPageRead(pdfId, pageNumber).catch(console.error)
      setLastPageRead(pageNumber)
    }
    
    // Reset flag after a short delay
    setTimeout(() => {
      isManualForwardNavigationRef.current = false
    }, 100)
  }, [pdfId, currentPage])

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
    // Also clear from storage
    if (pdfId) {
      storageService.saveChatMessages(pdfId, [])
    }
  }, [pdfId])

  const handleSaveInsight = useCallback((text: string) => {
    // Save insight as a blue highlight with pageNumber 0 to indicate it's from chat
    addHighlight({ pageNumber: 0, text }, undefined, 'blue')
    // Switch to highlights tab to show the saved insight
    setActiveTab('notes')
  }, [addHighlight])

  const handleExport = useCallback(() => {
    if (annotations.length === 0) {
      alert('No annotations to export')
      return
    }

    const markdown = exportToMarkdown(annotations)
    const filename = pdf ? `${pdf.file.name.replace('.pdf', '')}_notes.md` : 'notes.md'
    downloadMarkdown(markdown, filename)
  }, [annotations, pdf])

  const handleOpenFileComplete = useCallback(async (
    metadata: { title: string; author: string | null },
    importedAnnotations: any[],
    fileHandle: FileSystemFileHandle | null,
    fileName: string | null
  ) => {
    if (pdf) {
      const pdfId = `${pdf.file.name}_${pdf.file.size}`
      
      // Save metadata
      storageService.setDocumentMetadata(pdfId, metadata)
      setDocumentMetadata(metadata)
      
      // Handle sync file
      if (fileHandle && fileName) {
        await fileSyncService.setSyncFile(fileHandle, fileName)
        
        // Load page data from sync file (source of truth) and update state/localStorage
        isLoadingFromSyncFileRef.current = true
        try {
          const syncData = await fileSyncService.readSyncData()
          
          // Sync file is source of truth - force load furthestPage and lastPageRead from sync file
          // Use force=true to override localStorage values (sync file takes precedence)
          if (syncData.furthestPage !== null && syncData.furthestPage !== undefined) {
            // Don't sync back to file here - just update localStorage
            localStorage.setItem(`pdf_furthest_page_${pdfId}`, syncData.furthestPage.toString())
            setFurthestPage(syncData.furthestPage)
          }
          
          if (syncData.lastPageRead !== null && syncData.lastPageRead !== undefined) {
            await storageService.saveLastPageRead(pdfId, syncData.lastPageRead)
            setLastPageRead(syncData.lastPageRead)
            // Navigate to last page read from sync file (override any localStorage value)
            // Not manual forward navigation (loading from sync file)
            isManualForwardNavigationRef.current = false
            setCurrentPage(syncData.lastPageRead)
          }
          
          // Save metadata to sync file (source of truth) - preserve page values from sync file
          await fileSyncService.writeSyncData({
            ...syncData,
            metadata,
            annotations: importedAnnotations.length > 0 ? importedAnnotations : syncData.annotations,
            furthestPage: syncData.furthestPage ?? null,
            lastPageRead: syncData.lastPageRead ?? null
          })
        } catch (error) {
          console.warn('Failed to load from sync file:', error)
        } finally {
          // Reset flag after a delay to allow state updates to complete
          setTimeout(() => {
            isLoadingFromSyncFileRef.current = false
          }, 1000)
        }
        
        // Import annotations if provided
        if (importedAnnotations.length > 0) {
          await storageService.saveAnnotations(pdfId, importedAnnotations)
          reloadAnnotations()
        }
      } else {
        // No sync file selected - user skipped
        // Still save metadata to localStorage
      }
      
      setShowOpenFileModal(false)
    }
  }, [pdf, reloadAnnotations])

  const handleOpenFileCancel = useCallback(() => {
    // User cancelled - still save parsed metadata
    if (pdf && documentMetadata) {
      const pdfId = `${pdf.file.name}_${pdf.file.size}`
      storageService.setDocumentMetadata(pdfId, documentMetadata)
    }
    setShowOpenFileModal(false)
  }, [pdf, documentMetadata])

  // Debounce timer refs for UI state
  const uiStateDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const isAutoSyncingRef = useRef<boolean>(false)
  const isLoadingFromSyncFileRef = useRef<boolean>(false)
  const isManualForwardNavigationRef = useRef<boolean>(false)

  // Load persisted data when PDF changes
  useEffect(() => {
    if (pdfId) {
      const loadPersistedData = async () => {
        // Load chat messages
        const savedMessages = storageService.getChatMessages(pdfId)
        if (savedMessages.length > 0) {
          setChatMessages(savedMessages)
        }

        // Load UI state (page, scale)
        const savedUIState = storageService.getUIState(pdfId)
        if (savedUIState) {
          // Not manual forward navigation (loading persisted state)
          isManualForwardNavigationRef.current = false
          setCurrentPage(savedUIState.currentPage)
          setScale(savedUIState.scale)
        } else {
          // Default scale if no saved state
          setScale(1.5)
        }

        // Load furthest page and last page read - check sync file first (source of truth)
        let savedFurthestPage: number | null = null
        let savedLastPageRead: number | null = null

        await fileSyncService.initialize()
        if (fileSyncService.hasSyncFile()) {
          isLoadingFromSyncFileRef.current = true
          try {
            const syncData = await fileSyncService.readSyncData()
            // Sync file is source of truth - use values from sync file if available
            // Don't sync back to file, just update localStorage and state
            if (syncData.furthestPage !== null && syncData.furthestPage !== undefined) {
              savedFurthestPage = syncData.furthestPage
              // Update localStorage directly without syncing back to file
              localStorage.setItem(`pdf_furthest_page_${pdfId}`, savedFurthestPage.toString())
            }
            if (syncData.lastPageRead !== null && syncData.lastPageRead !== undefined) {
              savedLastPageRead = syncData.lastPageRead
              // Update localStorage directly without syncing back to file
              localStorage.setItem(`pdf_last_page_read_${pdfId}`, savedLastPageRead.toString())
            }
          } catch (error) {
            console.warn('Failed to load page data from sync file, falling back to localStorage:', error)
          } finally {
            setTimeout(() => {
              isLoadingFromSyncFileRef.current = false
            }, 1000)
          }
        }

        // Fallback to localStorage if sync file doesn't have values
        if (savedFurthestPage === null) {
          savedFurthestPage = storageService.getFurthestPage(pdfId)
        }
        if (savedLastPageRead === null) {
          savedLastPageRead = storageService.getLastPageRead(pdfId)
        }

        setFurthestPage(savedFurthestPage)
        setLastPageRead(savedLastPageRead)

        // Auto sync to last page read if available
        if (savedLastPageRead !== null && savedLastPageRead > 0) {
          // Not manual forward navigation (loading persisted state)
          isManualForwardNavigationRef.current = false
          setCurrentPage(savedLastPageRead)
        }
      }

      loadPersistedData()

      // Don't show import modal here - it will show after metadata modal is closed
    } else {
      // Clear when no PDF
      setChatMessages([])
      setCurrentPage(1)
      setScale(1.5)
      setFurthestPage(null)
      setLastPageRead(null)
    }
  }, [pdfId])

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

  // Reload page data from sync file when sync file changes
  useEffect(() => {
    const handleSyncFileChanged = async () => {
      if (!pdfId) return
      
      isLoadingFromSyncFileRef.current = true
      await fileSyncService.initialize()
      if (fileSyncService.hasSyncFile()) {
        try {
          const syncData = await fileSyncService.readSyncData()
          
          // Load furthestPage and lastPageRead from sync file (source of truth)
          // Don't sync back to file - just update localStorage and state
          if (syncData.furthestPage !== null && syncData.furthestPage !== undefined) {
            localStorage.setItem(`pdf_furthest_page_${pdfId}`, syncData.furthestPage.toString())
            setFurthestPage(syncData.furthestPage)
          }
          
          if (syncData.lastPageRead !== null && syncData.lastPageRead !== undefined) {
            await storageService.saveLastPageRead(pdfId, syncData.lastPageRead)
            setLastPageRead(syncData.lastPageRead)
            // Navigate to last page read from sync file (override any localStorage value)
            // Not manual forward navigation (loading from sync file)
            isManualForwardNavigationRef.current = false
            setCurrentPage(syncData.lastPageRead)
          }
        } catch (error) {
          console.warn('Failed to reload page data from sync file:', error)
        } finally {
          setTimeout(() => {
            isLoadingFromSyncFileRef.current = false
          }, 1000)
        }
      }
    }

    window.addEventListener('syncFileChanged', handleSyncFileChanged)
    return () => {
      window.removeEventListener('syncFileChanged', handleSyncFileChanged)
    }
  }, [pdfId])

  // Show OpenFileModal when PDF loads - sync file is source of truth
  useEffect(() => {
    if (pdf) {
      const pdfId = `${pdf.file.name}_${pdf.file.size}`
      
        // Check sync file first (source of truth) for initial values
        const loadInitialValues = async () => {
          await fileSyncService.initialize()
          let initialMetadata: { title: string; author: string | null } | null = null
          
          if (fileSyncService.hasSyncFile()) {
            try {
              const syncData = await fileSyncService.readSyncData()
              if (syncData.metadata) {
                initialMetadata = syncData.metadata
              }
              // Load furthest page and last page read from sync file and save to localStorage
              if (syncData.furthestPage !== null && syncData.furthestPage !== undefined) {
                await storageService.saveFurthestPage(pdfId, syncData.furthestPage)
              }
              if (syncData.lastPageRead !== null && syncData.lastPageRead !== undefined) {
                await storageService.saveLastPageRead(pdfId, syncData.lastPageRead)
              }
            } catch (error) {
              // Fallback to localStorage
              initialMetadata = storageService.getDocumentMetadata(pdfId)
            }
          } else {
            // No sync file, check localStorage
            initialMetadata = storageService.getDocumentMetadata(pdfId)
          }
          
          // If no metadata found, parse filename
          if (!initialMetadata) {
            initialMetadata = parseFilename(pdf.file.name)
          }
          
          setDocumentMetadata(initialMetadata)
        
        // Always show OpenFileModal after a short delay
        const timer = setTimeout(() => {
          setShowOpenFileModal(true)
        }, 500)
        return () => clearTimeout(timer)
      }
      
      loadInitialValues()
    } else {
      setDocumentMetadata(null)
      setShowOpenFileModal(false)
    }
  }, [pdf])


  const handleMetadataChange = useCallback((metadata: { title: string; author: string | null }) => {
    setDocumentMetadata(metadata)
  }, [])

  // Save chat messages when they change
  useEffect(() => {
    if (pdfId && chatMessages.length > 0) {
      storageService.saveChatMessages(pdfId, chatMessages)
    }
  }, [pdfId, chatMessages])

  // Auto sync to furthest page when furthest page updates
  const previousFurthestPageRef = useRef<number | null>(null)
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

  // Save UI state (page, scale) with debouncing
  useEffect(() => {
    if (pdfId) {
      // Clear existing debounce timer
      if (uiStateDebounceRef.current) {
        clearTimeout(uiStateDebounceRef.current)
      }
      
      // Set new debounce timer
      uiStateDebounceRef.current = setTimeout(async () => {
        // Don't update furthestPage if we're currently loading from sync file
        if (isLoadingFromSyncFileRef.current) {
          return
        }
        
        storageService.saveUIState(pdfId, {
          currentPage,
          scale,
        })
        // Update furthest page when current page changes forward
        // Check sync file first (source of truth), then localStorage
        let currentFurthestPage: number | null = null
        try {
          await fileSyncService.initialize()
          if (fileSyncService.hasSyncFile()) {
            const syncData = await fileSyncService.readSyncData()
            currentFurthestPage = syncData.furthestPage ?? null
          }
        } catch (error) {
          // Fall back to localStorage if sync file check fails
          console.warn('Failed to check sync file for furthest page:', error)
        }
        
        // Fall back to localStorage if no sync file or sync file doesn't have furthestPage
        if (currentFurthestPage === null) {
          currentFurthestPage = storageService.getFurthestPage(pdfId)
        }
        
        // Only update if current page is greater than furthest page stored in sync file (or localStorage if no sync file)
        if (currentFurthestPage === null || currentPage > currentFurthestPage) {
          await storageService.saveFurthestPage(pdfId, currentPage)
          setFurthestPage(currentPage)
        }
        // Update last page read only for manual forward navigation
        // Don't update for shortcuts (go to furthest page, go to last page read), bookmarks, or backward navigation
        // Note: This is a fallback - manual forward navigation should save immediately in onNextPage/onPageChange
        if (isManualForwardNavigationRef.current && currentPage > (lastPageRead ?? 0)) {
          await storageService.saveLastPageRead(pdfId, currentPage)
          setLastPageRead(currentPage)
        }
      }, 500) // 500ms debounce
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (uiStateDebounceRef.current) {
        clearTimeout(uiStateDebounceRef.current)
      }
    }
  }, [pdfId, currentPage, scale])

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
    onNextPage: async () => {
      if (currentPage < numPages) {
        const nextPage = currentPage + 1
        // Mark as manual forward navigation
        isManualForwardNavigationRef.current = true
        setCurrentPage(nextPage)
        // Update furthest page when navigating forward
        // Check sync file first (source of truth) before updating
        if (pdfId) {
          let syncFileFurthestPage: number | null = null
          try {
            await fileSyncService.initialize()
            if (fileSyncService.hasSyncFile()) {
              const syncData = await fileSyncService.readSyncData()
              syncFileFurthestPage = syncData.furthestPage ?? null
            }
          } catch (error) {
            console.warn('Failed to check sync file for furthest page:', error)
          }
          
          // Use sync file value as source of truth, fall back to localStorage
          const currentFurthestPage = syncFileFurthestPage !== null ? syncFileFurthestPage : storageService.getFurthestPage(pdfId)
          
          // Only update if new page is greater than furthest page in sync file (or localStorage if no sync file)
          if (currentFurthestPage === null || nextPage > currentFurthestPage) {
            await storageService.saveFurthestPage(pdfId, nextPage)
            setFurthestPage(nextPage)
          }
          
          // Update last page read immediately for manual forward navigation
          await storageService.saveLastPageRead(pdfId, nextPage)
          setLastPageRead(nextPage)
        }
        // Reset flag after a delay (longer than debounce to allow useEffect fallback)
        setTimeout(() => {
          isManualForwardNavigationRef.current = false
        }, 600)
      }
    },
    onPreviousPage: () => {
      if (currentPage > 1) {
        // Not manual forward navigation (going backward)
        isManualForwardNavigationRef.current = false
        setCurrentPage(prev => prev - 1)
      }
    },
    onCloseSelection: () => {
      setSelectedText(null)
    },
    onTogglePanel: () => {
      setIsPanelCollapsed(prev => !prev)
    },
    enabled: !!pdf,
  })

  if (!pdf) {
    return <FileSelector onFileSelect={loadPDF} />
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {pdf && showOpenFileModal && (
        <OpenFileModal
          isOpen={showOpenFileModal}
          pdfFileName={pdf.file.name}
          initialTitle={documentMetadata?.title || parseFilename(pdf.file.name).title}
          initialAuthor={documentMetadata?.author || parseFilename(pdf.file.name).author}
          onComplete={handleOpenFileComplete}
          onCancel={handleOpenFileCancel}
        />
      )}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{pdf.file.name}</h1>
          <div className="flex items-center gap-2">
            <PDFControls
              scale={scale}
              onZoomIn={() => setScale(prev => Math.min(prev + 0.25, 3.0))}
              onZoomOut={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
              onFit={() => setScale(1.5)}
            />
            <button
              onClick={clearPDF}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm text-gray-900 dark:text-white"
            >
              Close PDF
            </button>
            <button
              onClick={() => {
                // Not manual forward navigation (shortcut navigation)
                isManualForwardNavigationRef.current = false
                if (pdfId !== null) {
                  const savedLastPageRead = storageService.getLastPageRead(pdfId)
                  if (savedLastPageRead !== null) {
                    setCurrentPage(savedLastPageRead)
                  }
                }
              }}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm flex items-center justify-center h-[28px] text-gray-900 dark:text-white"
              title={lastPageRead !== null ? `Sync to last page read (page ${lastPageRead})` : "Sync to last page read"}
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
            <button
              onClick={() => {
                // Not manual forward navigation (shortcut navigation)
                isManualForwardNavigationRef.current = false
                if (pdfId !== null) {
                  const savedFurthestPage = storageService.getFurthestPage(pdfId)
                  if (savedFurthestPage !== null) {
                    setCurrentPage(savedFurthestPage)
                  }
                }
              }}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm flex items-center justify-center h-[28px] text-gray-900 dark:text-white"
              title={furthestPage !== null ? `Sync to furthest page (page ${furthestPage})` : "Sync to furthest page"}
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>
            <button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm flex items-center justify-center h-[28px] text-gray-900 dark:text-white"
              title={isPanelCollapsed ? "Expand panel" : "Collapse panel"}
            >
              {isPanelCollapsed ? (
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <PDFViewer
          pdf={pdf}
          onTextSelect={handleTextSelect}
          onHighlight={handleHighlight}
          onSendToLLM={handleSendToLLM}
          highlights={annotations.filter((a): a is Extract<typeof a, { type: 'highlight' }> => a.type === 'highlight')}
          onNavigateToPage={handleNavigateToPage}
          currentPage={currentPage}
          onPageChange={async (page) => {
            // Page input is manual forward navigation if going forward
            const isForward = page > currentPage
            if (isForward) {
              isManualForwardNavigationRef.current = true
            } else {
              isManualForwardNavigationRef.current = false
            }
            setCurrentPage(page)
            // Update furthest page when navigating forward
            // Check sync file first (source of truth) before updating
            if (pdfId && isForward) {
              let syncFileFurthestPage: number | null = null
              try {
                await fileSyncService.initialize()
                if (fileSyncService.hasSyncFile()) {
                  const syncData = await fileSyncService.readSyncData()
                  syncFileFurthestPage = syncData.furthestPage ?? null
                }
              } catch (error) {
                console.warn('Failed to check sync file for furthest page:', error)
              }
              
              // Use sync file value as source of truth, fall back to localStorage
              const currentFurthestPage = syncFileFurthestPage !== null ? syncFileFurthestPage : storageService.getFurthestPage(pdfId)
              
              // Only update if new page is greater than furthest page in sync file (or localStorage if no sync file)
              if (currentFurthestPage === null || page > currentFurthestPage) {
                await storageService.saveFurthestPage(pdfId, page)
                setFurthestPage(page)
              }
              
              // Update last page read immediately for manual forward navigation
              await storageService.saveLastPageRead(pdfId, page)
              setLastPageRead(page)
            }
            // Reset flag after a delay (longer than debounce to allow useEffect fallback)
            setTimeout(() => {
              isManualForwardNavigationRef.current = false
            }, 600)
          }}
          onNumPagesChange={setNumPages}
          scale={scale}
          onScaleChange={setScale}
          onBookmark={addBookmark}
          isBookmarked={annotations.some((a) => a.type === 'bookmark' && a.pageNumber === currentPage)}
        />
      </div>
      
      <div 
        className={`flex-shrink-0 border-l border-gray-200 relative ${isPanelCollapsed ? 'hidden' : ''}`}
        style={{ width: `${sidebarWidth}px`, transition: 'width 0.2s ease-out' }}
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
          onAddNote={addNote}
          onRemoveAnnotation={removeAnnotation}
          onClearAll={clearAllAnnotations}
          onExport={handleExport}
          quotedText={quotedText}
          onQuotedTextClear={handleQuotedTextClear}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNavigateToPage={handleNavigateToPage}
          onUpdateHighlightNote={updateHighlightNote}
          chatMessages={chatMessages}
          onChatMessagesChange={setChatMessages}
          documentMetadata={documentMetadata}
          currentPage={currentPage}
          currentPageText={currentPageText}
          numPages={numPages}
          pdfId={pdfId}
          onDocumentMetadataChange={handleMetadataChange}
          onSaveInsight={handleSaveInsight}
          onClearChat={handleClearChat}
        />
      </div>
    </div>
  )
}

export default App
