import { useState, useEffect, useRef, useCallback } from 'react'
import type { Annotation } from '@/types'
import { AnnotationList } from './AnnotationList'
import { Chat } from './Chat'
import { SettingsPanel } from './SettingsPanel'
import { ExportPreviewModal } from './ExportPreviewModal'
import type { ExportFormat } from './ExportDropdown'
import { FreeFormNoteModal } from './FreeFormNoteModal'
import { UnsavedNotesWarning } from './UnsavedNotesWarning'
import { fileSyncService } from '@/services/fileSync/fileSyncService'
import { storageService } from '@/services/storage/storageService'

interface NotesPanelProps {
  annotations: Annotation[]
  onAddNote: (content: string, pageNumber?: number) => void
  onRemoveAnnotation: (id: string) => void
  onClearAll: () => void
  onExport: (format: ExportFormat) => void
  quotedText?: string | null
  onQuotedTextClear?: () => void
  activeTab?: 'notes' | 'chat' | 'settings'
  onTabChange?: (tab: 'notes' | 'chat' | 'settings') => void
  onNavigateToPage?: (pageNumber: number) => void
  onUpdateHighlightNote?: (id: string, note: string) => void
  onUpdateNote?: (id: string, content: string, pageNumber?: number) => void
  chatMessages?: Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>
  onChatMessagesChange?: (messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>) => void
  documentMetadata?: { title: string; author: string | null } | null
  currentPage?: number
  currentPageText?: string
  numPages?: number
  pdfId?: string | null
  onDocumentMetadataChange?: (metadata: { title: string; author: string | null }) => void
  onSaveInsight?: (text: string) => void
  onClearChat?: () => void
  onReloadAnnotations?: () => void
  resetFilterTrigger?: number
  onExpandSyncFileSection?: () => void
  expandSyncFileSection?: boolean
  onSyncFileSectionExpanded?: () => void
  isCollapsed?: boolean
  onToggleCollapsed?: () => void
}

export function NotesPanel({
  annotations,
  onAddNote,
  onRemoveAnnotation,
  onExport,
  quotedText,
  onQuotedTextClear,
  activeTab: controlledActiveTab,
  onTabChange,
  onNavigateToPage,
  onUpdateHighlightNote,
  onUpdateNote,
  chatMessages,
  onChatMessagesChange,
  documentMetadata,
  currentPage,
  currentPageText,
  pdfId,
  onDocumentMetadataChange,
  onSaveInsight,
  onClearChat,
  onReloadAnnotations,
  resetFilterTrigger,
  onExpandSyncFileSection,
  expandSyncFileSection,
  onSyncFileSectionExpanded,
  isCollapsed,
  onToggleCollapsed,
}: NotesPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'notes' | 'chat' | 'settings'>('chat')
  const activeTab = controlledActiveTab ?? internalActiveTab
  const setActiveTab = onTabChange ?? setInternalActiveTab
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showExportPreview, setShowExportPreview] = useState(false)
  const [editingNote, setEditingNote] = useState<{ id: string; content: string; pageNumber?: number } | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'highlight' | 'note' | 'bookmark' | 'saved-from-chat'>('all')
  const prevResetFilterTriggerRef = useRef<number | undefined>(undefined)
  const [hasSyncFile, setHasSyncFile] = useState<boolean>(false)
  const [isWarningDismissed, setIsWarningDismissed] = useState<boolean>(false)
  const [useIconsOnly, setUseIconsOnly] = useState(false)
  const tabBarRef = useRef<HTMLDivElement>(null)

  // Measure tab bar width and switch to icons only when narrow
  const checkTabBarWidth = useCallback(() => {
    if (tabBarRef.current) {
      // 360px gives comfortable spacing for text tabs (3 tabs with text + collapse button)
      const shouldUseIcons = tabBarRef.current.offsetWidth < 360
      setUseIconsOnly(shouldUseIcons)
    }
  }, [])

  useEffect(() => {
    checkTabBarWidth()
    const resizeObserver = new ResizeObserver(() => {
      checkTabBarWidth()
    })
    if (tabBarRef.current) {
      resizeObserver.observe(tabBarRef.current)
    }
    return () => resizeObserver.disconnect()
  }, [checkTabBarWidth])

  // Reset filter to 'all' only when a highlight is added (triggered by resetFilterTrigger)
  // Only depend on resetFilterTrigger to avoid resetting on manual tab switches
  useEffect(() => {
    if (resetFilterTrigger !== undefined && 
        resetFilterTrigger !== prevResetFilterTriggerRef.current) {
      // Only reset if we're on the notes tab (which should be the case when highlight is added)
      if (activeTab === 'notes') {
        setTypeFilter('all')
      }
      prevResetFilterTriggerRef.current = resetFilterTrigger
    }
  }, [resetFilterTrigger, activeTab])

  // Check sync file status and warning dismissed state
  useEffect(() => {
    const checkSyncFile = async () => {
      try {
        await fileSyncService.initialize()
        const hasSync = fileSyncService.hasSyncFile()
        setHasSyncFile(hasSync)
        // If sync file is created, clear dismissed state
        if (hasSync) {
          setIsWarningDismissed(false)
          if (pdfId) {
            storageService.setWarningDismissed(pdfId, false)
          }
        }
      } catch (error) {
        setHasSyncFile(false)
      }
    }
    checkSyncFile()
    
    // Load dismissed state from storage
    if (pdfId) {
      setIsWarningDismissed(storageService.isWarningDismissed(pdfId))
    }
    
    // Listen for sync file creation events
    const handleSyncFileCreated = () => {
      const hasSync = fileSyncService.hasSyncFile()
      setHasSyncFile(hasSync)
      // If sync file is created, clear dismissed state
      if (hasSync) {
        setIsWarningDismissed(false)
        if (pdfId) {
          storageService.setWarningDismissed(pdfId, false)
        }
      }
    }
    window.addEventListener('syncFileCreated', handleSyncFileCreated)
    
    // Recheck periodically and when annotations change (in case sync file was created)
    const interval = setInterval(() => {
      const hasSync = fileSyncService.hasSyncFile()
      setHasSyncFile(hasSync)
      // If sync file is created, clear dismissed state
      if (hasSync) {
        setIsWarningDismissed(false)
        if (pdfId) {
          storageService.setWarningDismissed(pdfId, false)
        }
      }
    }, 2000)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('syncFileCreated', handleSyncFileCreated)
    }
  }, [annotations.length, pdfId])

  // Listen for switch to settings event from Chat component
  useEffect(() => {
    const handleSwitchToSettings = () => {
      setActiveTab('settings')
    }
    
    window.addEventListener('switchToSettings', handleSwitchToSettings)
    
    return () => {
      window.removeEventListener('switchToSettings', handleSwitchToSettings)
    }
  }, [setActiveTab])

  const handleCreateSyncFile = () => {
    if (onExpandSyncFileSection) {
      onExpandSyncFileSection()
    }
  }

  const handleDismissWarning = () => {
    if (pdfId) {
      storageService.setWarningDismissed(pdfId, true)
      setIsWarningDismissed(true)
    }
  }

  const handleRestoreWarning = () => {
    if (pdfId) {
      storageService.setWarningDismissed(pdfId, false)
      setIsWarningDismissed(false)
    }
  }

  const handleIconClick = (tab: 'notes' | 'chat' | 'settings') => {
    if (isCollapsed && onToggleCollapsed) {
      onToggleCollapsed()
    }
    setActiveTab(tab)
  }

  // Collapsed icon sidebar
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 w-12">
        <div className="flex flex-col items-center py-2 gap-1">
          {/* Expand button */}
          <button
            onClick={onToggleCollapsed}
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors focus:outline-none"
            title="Expand panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
              <line x1="15" y1="3" x2="15" y2="21" strokeWidth={1.5} />
            </svg>
          </button>

          {/* Separator */}
          <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 my-1" />

          {/* Chat icon */}
          <button
            onClick={() => handleIconClick('chat')}
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors focus:outline-none ${
              activeTab === 'chat'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            title="Chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>

          {/* Notes icon */}
          <button
            onClick={() => handleIconClick('notes')}
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors focus:outline-none ${
              activeTab === 'notes'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            title="Notes"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          {/* Settings icon */}
          <button
            onClick={() => handleIconClick('settings')}
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors focus:outline-none ${
              activeTab === 'settings'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      <div ref={tabBarRef} className="flex border-b border-gray-200 dark:border-gray-700 items-center h-[61px] px-4 gap-2 min-w-0" role="tablist">
        <div className={`flex items-center ${useIconsOnly ? 'gap-1' : 'gap-4'} min-w-0 flex-shrink`}>
          <button
            role="tab"
            aria-selected={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            className={`flex items-center justify-center gap-2 relative flex-shrink-0 focus:outline-none ${
              useIconsOnly 
                ? 'w-10 h-10 rounded' 
                : 'px-2 py-1 text-sm font-medium h-[28px]'
            } ${
              activeTab === 'chat'
                ? useIconsOnly 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-blue-600 dark:text-blue-400'
                : useIconsOnly
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            title="Chat"
          >
            <svg className={useIconsOnly ? 'w-5 h-5' : 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {!useIconsOnly && 'Chat'}
            {activeTab === 'chat' && !useIconsOnly && (
              <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
            )}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'notes'}
            onClick={() => setActiveTab('notes')}
            className={`flex items-center justify-center gap-2 relative flex-shrink-0 focus:outline-none ${
              useIconsOnly 
                ? 'w-10 h-10 rounded' 
                : 'px-2 py-1 text-sm font-medium h-[28px]'
            } ${
              activeTab === 'notes'
                ? useIconsOnly 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-blue-600 dark:text-blue-400'
                : useIconsOnly
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            title="Notes"
          >
            <svg className={useIconsOnly ? 'w-5 h-5' : 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!useIconsOnly && 'Notes'}
            {activeTab === 'notes' && !useIconsOnly && (
              <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
            )}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            className={`flex items-center justify-center gap-2 relative flex-shrink-0 focus:outline-none ${
              useIconsOnly 
                ? 'w-10 h-10 rounded' 
                : 'px-2 py-1 text-sm font-medium h-[28px]'
            } ${
              activeTab === 'settings'
                ? useIconsOnly 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-blue-600 dark:text-blue-400'
                : useIconsOnly
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            title="Settings"
          >
            <svg className={useIconsOnly ? 'w-5 h-5' : 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {!useIconsOnly && 'Settings'}
            {activeTab === 'settings' && !useIconsOnly && (
              <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
            )}
          </button>
        </div>
        {/* Spacer to push collapse button to the right */}
        <div className="flex-1 min-w-0" />
        {/* Collapse button */}
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors flex-shrink-0 focus:outline-none"
            title="Collapse panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
              <line x1="15" y1="3" x2="15" y2="21" strokeWidth={1.5} />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'notes' ? '' : 'hidden'}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'highlight' | 'note' | 'bookmark' | 'saved-from-chat')}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                <option value="highlight">Highlights</option>
                <option value="note">Notes</option>
                <option value="bookmark">Bookmarks</option>
                <option value="saved-from-chat">Saved from chat</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              {annotations.length > 0 && !hasSyncFile && isWarningDismissed && (
                <button
                  onClick={handleRestoreWarning}
                  className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors focus:outline-none"
                  aria-label="Show sync warning"
                  title="Your notes are not synced"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={() => {
                  setEditingNote(null)
                  setShowNoteModal(true)
                }}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none"
                title="New Note"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => setShowExportPreview(true)}
                disabled={annotations.length === 0}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
                title="Export"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
          {/* Warning banner */}
          {annotations.length > 0 && !hasSyncFile && activeTab === 'notes' && !isWarningDismissed && (
            <UnsavedNotesWarning
              onCreateSyncFile={handleCreateSyncFile}
              onDismiss={handleDismissWarning}
            />
          )}
          {/* Content area */}
          <div className="flex-1 overflow-auto pt-4 px-4 pb-4">
            <AnnotationList
              annotations={
                typeFilter === 'all'
                  ? annotations
                  : typeFilter === 'saved-from-chat'
                  ? annotations.filter((a) => a.type === 'highlight' && a.pageNumber === 0)
                  : annotations.filter((a) => a.type === typeFilter)
              }
              filterType={typeFilter}
              onRemove={onRemoveAnnotation}
              onNavigateToPage={onNavigateToPage}
              onUpdateHighlightNote={onUpdateHighlightNote}
              onEditNote={(id, content, pageNumber) => {
                setEditingNote({ id, content, pageNumber })
                setShowNoteModal(true)
              }}
            />
          </div>
        </div>

        <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'chat' ? '' : 'hidden'}`}>
          <Chat 
            quotedText={quotedText} 
            onQuotedTextClear={onQuotedTextClear}
            messages={chatMessages}
            onMessagesChange={onChatMessagesChange}
            documentMetadata={documentMetadata}
            currentPage={currentPage}
            currentPageText={currentPageText}
            onSaveInsight={onSaveInsight}
            onClearChat={onClearChat}
          />
        </div>

        <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'settings' ? '' : 'hidden'}`}>
          <SettingsPanel 
            documentMetadata={documentMetadata}
            pdfId={pdfId}
            onDocumentMetadataChange={onDocumentMetadataChange}
            onReloadAnnotations={onReloadAnnotations}
            expandSyncFileSection={expandSyncFileSection}
            onSyncFileSectionExpanded={onSyncFileSectionExpanded}
          />
        </div>
      </div>
      <FreeFormNoteModal
        isOpen={showNoteModal}
        onSave={(content, pageNumber) => {
          if (editingNote && onUpdateNote) {
            onUpdateNote(editingNote.id, content, pageNumber)
            setShowNoteModal(false)
            setEditingNote(null)
          } else {
            onAddNote(content, pageNumber)
            setShowNoteModal(false)
          }
        }}
        onCancel={() => {
          setShowNoteModal(false)
          setEditingNote(null)
        }}
        initialContent={editingNote?.content}
        initialPageNumber={editingNote?.pageNumber}
        currentPage={currentPage}
      />
      <ExportPreviewModal
        isOpen={showExportPreview}
        annotations={annotations}
        documentMetadata={documentMetadata}
        onExport={(format) => {
          onExport(format)
          setShowExportPreview(false)
        }}
        onClose={() => setShowExportPreview(false)}
      />
    </div>
  )
}
