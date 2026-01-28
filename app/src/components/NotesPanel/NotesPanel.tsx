import { useState, useEffect, useRef } from 'react'
import type { Annotation } from '@/types'
import { AnnotationList } from './AnnotationList'
import { Chat } from './Chat'
import { SettingsPanel } from './SettingsPanel'
import { ExportDropdown, type ExportFormat } from './ExportDropdown'
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
}: NotesPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'notes' | 'chat' | 'settings'>('chat')
  const activeTab = controlledActiveTab ?? internalActiveTab
  const setActiveTab = onTabChange ?? setInternalActiveTab
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editingNote, setEditingNote] = useState<{ id: string; content: string; pageNumber?: number } | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'highlight' | 'note' | 'bookmark' | 'saved-from-chat'>('all')
  const prevResetFilterTriggerRef = useRef<number | undefined>(undefined)
  const [hasSyncFile, setHasSyncFile] = useState<boolean>(false)
  const [isWarningDismissed, setIsWarningDismissed] = useState<boolean>(false)

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
  }, [resetFilterTrigger])

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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      <div className="flex border-b border-gray-200 dark:border-gray-700 items-center h-[61px] px-4">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-3 py-1 text-base font-medium h-[28px] flex items-center relative ${
            activeTab === 'chat'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Chat
          {activeTab === 'chat' && (
            <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-3 py-1 text-base font-medium h-[28px] flex items-center relative ${
            activeTab === 'notes'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Notes
          {activeTab === 'notes' && (
            <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-1 text-base font-medium h-[28px] flex items-center relative ${
            activeTab === 'settings'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Settings
          {activeTab === 'settings' && (
            <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'notes' ? '' : 'hidden'}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notes</h2>
              {annotations.length > 0 && !hasSyncFile && isWarningDismissed && (
                <button
                  onClick={handleRestoreWarning}
                  className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
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
            </div>
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
              <button
                onClick={() => {
                  setEditingNote(null)
                  setShowNoteModal(true)
                }}
                className="px-3 py-1 bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 text-sm"
              >
                New Note
              </button>
              <ExportDropdown
                onExport={onExport}
                disabled={annotations.length === 0}
              />
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
          <div className="flex-1 overflow-auto pt-4 px-4">
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

        <div className={`flex-1 overflow-auto p-4 ${activeTab === 'settings' ? '' : 'hidden'}`}>
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
    </div>
  )
}
