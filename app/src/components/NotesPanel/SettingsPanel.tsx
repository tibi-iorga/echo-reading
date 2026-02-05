import { useState, useEffect, useRef } from 'react'
import { llmService } from '@/services/llm/llmService'
import { storageService } from '@/services/storage/storageService'
import { fileSyncService } from '@/services/fileSync/fileSyncService'
import { importAnnotations, readFileAsText } from '@/utils/import'
import { useTheme } from '@/contexts/ThemeContext'
import { VERSION } from '@/constants/version'
import { ConfirmModal } from '@/components/ConfirmModal/ConfirmModal'
import { AlertModal } from '@/components/AlertModal/AlertModal'

interface SettingsPanelProps {
  documentMetadata?: { title: string; author: string | null } | null
  onDocumentMetadataChange?: (metadata: { title: string; author: string | null }) => void
  pdfId?: string | null
  onReloadAnnotations?: () => void
  expandSyncFileSection?: boolean
  onSyncFileSectionExpanded?: () => void
}

const DEFAULT_CHAT_INSTRUCTIONS = `You are a helpful reading assistant. The user is currently reading "{{document_title}}"{{document_author}}.

Your role is to help users deeply understand the material they are reading.

When users share text from their PDF:
- Provide clear, accurate explanations
- Help clarify complex concepts
- Connect ideas to broader themes when relevant
- Ask follow-up questions if the user's question is unclear
- Be concise but thorough

The user is actively reading and learning, so prioritize clarity and understanding over brevity.`

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } else {
    return date.toLocaleDateString()
  }
}

export function SettingsPanel({ documentMetadata, onDocumentMetadataChange, pdfId, onReloadAnnotations, expandSyncFileSection, onSyncFileSectionExpanded }: SettingsPanelProps = {}) {
  const { theme, toggleTheme } = useTheme()
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [chatInstructions, setChatInstructions] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [docAuthor, setDocAuthor] = useState('')
  
  // Per-section save states
  const [isSavingLLM, setIsSavingLLM] = useState(false)
  const [showSuccessLLM, setShowSuccessLLM] = useState(false)
  const [isSavingDocument, setIsSavingDocument] = useState(false)
  const [showSuccessDocument, setShowSuccessDocument] = useState(false)
  const [isSavingInstructions, setIsSavingInstructions] = useState(false)
  const [showSuccessInstructions, setShowSuccessInstructions] = useState(false)
  const [syncFileName, setSyncFileName] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isChangingFile, setIsChangingFile] = useState(false)
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isStyleExpanded, setIsStyleExpanded] = useState(true)
  const [isLLMConfigExpanded, setIsLLMConfigExpanded] = useState(true)
  const [isDocumentInfoExpanded, setIsDocumentInfoExpanded] = useState(true)
  const [isSourceFileExpanded, setIsSourceFileExpanded] = useState(true)
  const syncFileSectionRef = useRef<HTMLDivElement>(null)
  
  // API key UI state
  const [showApiKey, setShowApiKey] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showRemoveApiKeyConfirm, setShowRemoveApiKeyConfirm] = useState(false)
  const [isInFallbackMode, setIsInFallbackMode] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string; variant?: 'error' | 'warning' | 'info' | 'success' }>({
    isOpen: false,
    message: '',
    variant: 'error',
  })
  
  // Expand sync file section when requested and scroll to it
  useEffect(() => {
    if (expandSyncFileSection) {
      setIsSourceFileExpanded(true)
      // Scroll to the sync file section after a short delay to ensure it's rendered
      setTimeout(() => {
        if (syncFileSectionRef.current) {
          syncFileSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
      // Notify parent that expansion has been applied
      if (onSyncFileSectionExpanded) {
        onSyncFileSectionExpanded()
      }
    }
  }, [expandSyncFileSection, onSyncFileSectionExpanded])
  const [isChatInstructionsExpanded, setIsChatInstructionsExpanded] = useState(true)
  
  // Track saved values to detect unsaved changes
  const [savedApiKey, setSavedApiKey] = useState('')
  const [savedModel, setSavedModel] = useState('')
  const [savedChatInstructions, setSavedChatInstructions] = useState('')
  const [savedDocTitle, setSavedDocTitle] = useState('')
  const [savedDocAuthor, setSavedDocAuthor] = useState('')

  // Use refs to track current values for the interval callback without causing re-renders
  const docTitleRef = useRef(docTitle)
  const docAuthorRef = useRef(docAuthor)
  const savedDocTitleRef = useRef(savedDocTitle)
  const savedDocAuthorRef = useRef(savedDocAuthor)

  // Keep refs in sync with state
  useEffect(() => {
    docTitleRef.current = docTitle
    docAuthorRef.current = docAuthor
    savedDocTitleRef.current = savedDocTitle
    savedDocAuthorRef.current = savedDocAuthor
  }, [docTitle, docAuthor, savedDocTitle, savedDocAuthor])

  useEffect(() => {
    const loadSettings = async () => {
      // Load API key (now async)
      const storedKey = await storageService.getApiKey()
      const storedInstructions = storageService.getChatInstructions()
      const storedModel = storageService.getModel()
      
      // Check fallback mode
      setIsInFallbackMode(storageService.isApiKeyInFallbackMode())
      
      if (storedKey) {
        setApiKey(storedKey)
        setSavedApiKey(storedKey)
      }
      
      // Always use OpenAI as the provider
      llmService.setProvider('OpenAI')
      const currentProvider = llmService.getCurrentProvider()
      const defaultModel = currentProvider?.getDefaultModel() || 'gpt-4o'
      const availableModels = currentProvider?.getAvailableModels() || []
      // Use stored model if it's still available, otherwise use default
      const modelToUse = (storedModel && availableModels.includes(storedModel)) ? storedModel : defaultModel
      setSelectedModel(modelToUse)
      setSavedModel(modelToUse)
      
      if (storedInstructions) {
        setChatInstructions(storedInstructions)
        setSavedChatInstructions(storedInstructions)
      } else {
        setChatInstructions(DEFAULT_CHAT_INSTRUCTIONS)
        setSavedChatInstructions(DEFAULT_CHAT_INSTRUCTIONS)
      }

      // Load document metadata if available (only on initial load or pdfId change)
      if (documentMetadata) {
        setDocTitle(documentMetadata.title)
        setDocAuthor(documentMetadata.author || '')
        setSavedDocTitle(documentMetadata.title)
        setSavedDocAuthor(documentMetadata.author || '')
      } else if (pdfId) {
        const stored = storageService.getDocumentMetadata(pdfId)
        if (stored) {
          setDocTitle(stored.title)
          setDocAuthor(stored.author || '')
          setSavedDocTitle(stored.title)
          setSavedDocAuthor(stored.author || '')
        }
      }

      // Load sync file name and last updated time
      const fileName = fileSyncService.getSyncFileName()
      setSyncFileName(fileName)
      
      // Fetch last updated time and metadata if file exists
      if (fileName && fileSyncService.hasSyncFile()) {
        try {
          const time = await fileSyncService.getLastModifiedTime()
          setLastUpdated(time)
          
          // Load metadata from sync file (on initial load, always update)
          const syncData = await fileSyncService.readSyncData()
          if (syncData.metadata) {
            // Update document metadata from sync file if it exists
            if (pdfId && onDocumentMetadataChange) {
              onDocumentMetadataChange({
                title: syncData.metadata.title,
                author: syncData.metadata.author
              })
            }
            // Also update local state
            setDocTitle(syncData.metadata.title || '')
            setDocAuthor(syncData.metadata.author || '')
            setSavedDocTitle(syncData.metadata.title || '')
            setSavedDocAuthor(syncData.metadata.author || '')
          }
        } catch {
          setLastUpdated(null)
        }
      } else {
        setLastUpdated(null)
      }
    }
    
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfId]) // Only reload when pdfId changes, not when documentMetadata changes

  // Separate effect for periodic refresh of last modified time (every 5 seconds)
  useEffect(() => {
    const updateLastModified = async () => {
      const fileName = fileSyncService.getSyncFileName()
      if (fileName && fileSyncService.hasSyncFile()) {
        try {
          const time = await fileSyncService.getLastModifiedTime()
          setLastUpdated(time)
          
          // Only refresh metadata from sync file if there are no unsaved changes
          const syncData = await fileSyncService.readSyncData()
          if (syncData.metadata && pdfId) {
            // Check if there are unsaved changes before updating (use refs to get current values)
            const currentTitle = docTitleRef.current.trim()
            const currentAuthor = (docAuthorRef.current.trim() || '')
            const savedTitle = savedDocTitleRef.current.trim()
            const savedAuthor = (savedDocAuthorRef.current || '')
            const hasUnsaved = currentTitle !== savedTitle || currentAuthor !== savedAuthor
            
            if (!hasUnsaved) {
              // Update document metadata from sync file if it exists
              if (onDocumentMetadataChange) {
                onDocumentMetadataChange({
                  title: syncData.metadata.title,
                  author: syncData.metadata.author
                })
              }
              // Also update local state
              setDocTitle(syncData.metadata.title || '')
              setDocAuthor(syncData.metadata.author || '')
              setSavedDocTitle(syncData.metadata.title || '')
              setSavedDocAuthor(syncData.metadata.author || '')
            }
          }
        } catch {
          setLastUpdated(null)
        }
      }
    }
    
    const intervalId = setInterval(updateLastModified, 5000)
    
    return () => {
      clearInterval(intervalId)
    }
  }, [pdfId, onDocumentMetadataChange]) // Only recreate interval when pdfId changes, not on every keystroke

  // Check unsaved changes per section
  const hasUnsavedLLMChanges = () => {
    const apiKeyChanged = apiKey.trim() !== savedApiKey
    const modelChanged = selectedModel !== savedModel
    return apiKeyChanged || modelChanged
  }


  const hasUnsavedInstructionsChanges = () => {
    return chatInstructions.trim() !== savedChatInstructions
  }

  const hasUnsavedDocumentChanges = () => {
    if (!pdfId) return false
    const titleChanged = docTitle.trim() !== savedDocTitle
    const authorChanged = docAuthor.trim() !== savedDocAuthor
    return titleChanged || authorChanged
  }

  // Save handlers for each section
  const handleSaveLLM = async () => {
    setIsSavingLLM(true)
    setTestResult(null)
    
    // Small delay to show button state change
    await new Promise(resolve => setTimeout(resolve, 150))
    
    const hadApiKeyBefore = await storageService.hasApiKey()
    
    // Handle API key: save if provided, remove if empty
    if (apiKey.trim()) {
      await storageService.setApiKey(apiKey.trim())
      setSavedApiKey(apiKey.trim())
    } else {
      // Remove API key from storage if cleared
      await storageService.removeApiKey()
      setSavedApiKey('')
    }
    
    // Save model
    storageService.setModel(selectedModel)
    setSavedModel(selectedModel)
    
    // Always use OpenAI as the provider
    llmService.setProvider('OpenAI')
    
    // Dispatch event if API key status changed (added or removed)
    const hasApiKeyAfter = await storageService.hasApiKey()
    if (hadApiKeyBefore !== hasApiKeyAfter) {
      window.dispatchEvent(new CustomEvent('apiKeySaved'))
    }
    
    setIsSavingLLM(false)
    setShowSuccessLLM(true)
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessLLM(false)
    }, 3000)
  }

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key first' })
      return
    }
    
    setIsTesting(true)
    setTestResult(null)
    
    try {
      const result = await llmService.testConnection(apiKey.trim())
      setTestResult(result)
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection test failed' 
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleRemoveApiKey = () => {
    setShowRemoveApiKeyConfirm(true)
  }

  const handleConfirmRemoveApiKey = async () => {
    setShowRemoveApiKeyConfirm(false)
    setIsRemoving(true)
    
    try {
      await storageService.removeApiKey()
      setApiKey('')
      setSavedApiKey('')
      setTestResult(null)
      window.dispatchEvent(new CustomEvent('apiKeySaved'))
    } catch (error) {
      console.error('Failed to remove API key:', error)
      setAlertState({
        isOpen: true,
        message: 'Failed to remove API key',
        variant: 'error',
      })
    } finally {
      setIsRemoving(false)
    }
  }


  const handleSaveInstructions = async () => {
    setIsSavingInstructions(true)
    
    // Small delay to show button state change
    await new Promise(resolve => setTimeout(resolve, 150))
    
    storageService.setChatInstructions(chatInstructions.trim())
    setSavedChatInstructions(chatInstructions.trim())
    
    setIsSavingInstructions(false)
    setShowSuccessInstructions(true)
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessInstructions(false)
    }, 3000)
  }

  const handleSaveDocument = async () => {
    if (!pdfId || !docTitle.trim() || !docAuthor.trim()) return
    
    setIsSavingDocument(true)
    
    // Small delay to show button state change
    await new Promise(resolve => setTimeout(resolve, 150))
    
    const metadata = { title: docTitle.trim(), author: docAuthor.trim() }
    storageService.setDocumentMetadata(pdfId, metadata)
    setSavedDocTitle(docTitle.trim())
    setSavedDocAuthor(docAuthor.trim() || '')
    
    // Also save to sync file if it exists
    if (fileSyncService.hasSyncFile()) {
      try {
        const syncData = await fileSyncService.readSyncData()
        await fileSyncService.writeSyncData({
          ...syncData,
          metadata
        })
      } catch (error) {
        console.warn('Failed to save metadata to sync file:', error)
      }
    }
    
    if (onDocumentMetadataChange) {
      onDocumentMetadataChange(metadata)
    }
    
    setIsSavingDocument(false)
    setShowSuccessDocument(true)
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessDocument(false)
    }, 3000)
  }

  const handleChangeSourceFile = async () => {
    if (!pdfId) return
    
    setIsChangingFile(true)
    
    try {
      if (!fileSyncService.isSupported()) {
        setAlertState({
          isOpen: true,
          message: 'File System Access API is not supported in this browser.',
          variant: 'error',
        })
        setIsChangingFile(false)
        return
      }

      const fileHandle = await fileSyncService.requestFileHandle()
      
      if (!fileHandle) {
        // User cancelled
        setIsChangingFile(false)
        return
      }

      const file = await fileHandle.getFile()
      const content = await readFileAsText(file)
      const result = importAnnotations(content)

      if (!result.success) {
        setAlertState({
          isOpen: true,
          message: result.error || 'Failed to import notes from the selected file',
          variant: 'error',
        })
        setIsChangingFile(false)
        return
      }

      await fileSyncService.setSyncFile(fileHandle, file.name)
      setSyncFileName(file.name)
      
      // Update last modified time
      const lastModified = await fileSyncService.getLastModifiedTime()
      setLastUpdated(lastModified)
      
      // Load page data and metadata from sync file (source of truth) and update localStorage
      // Use force=true to override localStorage (sync file takes precedence)
      try {
        const syncData = await fileSyncService.readSyncData()
        
        if (syncData.furthestPage !== null && syncData.furthestPage !== undefined) {
          await storageService.saveFurthestPage(pdfId, syncData.furthestPage, true)
        }
        
        if (syncData.lastPageRead !== null && syncData.lastPageRead !== undefined) {
          await storageService.saveLastPageRead(pdfId, syncData.lastPageRead)
        }
        
        // Update metadata from sync file
        if (syncData.metadata) {
          // Update document metadata from sync file
          if (onDocumentMetadataChange) {
            onDocumentMetadataChange({
              title: syncData.metadata.title,
              author: syncData.metadata.author
            })
          }
          // Also update local state
          setDocTitle(syncData.metadata.title || '')
          setDocAuthor(syncData.metadata.author || '')
          setSavedDocTitle(syncData.metadata.title || '')
          setSavedDocAuthor(syncData.metadata.author || '')
        }
      } catch (error) {
        console.warn('Failed to load page data from sync file:', error)
      }
      
      // Save annotations to storage for the current PDF
      if (result.annotations.length > 0) {
        await storageService.saveAnnotations(pdfId, result.annotations)
      } else {
        // If the file is empty, clear annotations
        await storageService.saveAnnotations(pdfId, [])
      }
      
      // Reload annotations from storage
      if (onReloadAnnotations) {
        onReloadAnnotations()
      }
      
      // Notify parent that sync file was connected (to hide warning banner and reload page data)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('syncFileCreated'))
        window.dispatchEvent(new CustomEvent('syncFileChanged'))
      }, 100)
    } catch (err) {
      setAlertState({
        isOpen: true,
        message: err instanceof Error ? err.message : 'Failed to change sync file',
        variant: 'error',
      })
    } finally {
      setIsChangingFile(false)
    }
  }

  const handleCreateNewFile = async () => {
    if (!pdfId) return
    
    setIsCreatingFile(true)
    
    try {
      if (!fileSyncService.isSupported()) {
        setAlertState({
          isOpen: true,
          message: 'File System Access API is not supported in this browser.',
          variant: 'error',
        })
        setIsCreatingFile(false)
        return
      }

      const baseName = documentMetadata?.title || 'notes'
      const sanitizedBaseName = baseName.replace(/[^a-z0-9]/gi, '_')
      const fileName = `${sanitizedBaseName}_sync_notes.json`

      const fileHandle = await fileSyncService.createFileHandle(fileName)

      if (!fileHandle) {
        // User cancelled
        setIsCreatingFile(false)
        return
      }

      await fileSyncService.setSyncFile(fileHandle, fileName)
      setSyncFileName(fileName)
      
      // Get current annotations, page data, and metadata from storage and write them to the new file
      const currentAnnotations = storageService.getAnnotations(pdfId)
      const furthestPage = storageService.getFurthestPage(pdfId)
      const lastPageRead = storageService.getLastPageRead(pdfId)
      const currentMetadata = documentMetadata || storageService.getDocumentMetadata(pdfId) || { title: '', author: null }
      
      await fileSyncService.writeSyncData({
        annotations: currentAnnotations,
        furthestPage,
        lastPageRead,
        metadata: currentMetadata
      })
      
      // Update last modified time after writing
      const lastModified = await fileSyncService.getLastModifiedTime()
      setLastUpdated(lastModified)
      
      // Reload annotations (this will sync them properly)
      if (onReloadAnnotations) {
        onReloadAnnotations()
      }
      
      // Notify parent that sync file was created (to hide warning banner)
      if (onSyncFileSectionExpanded) {
        // Small delay to ensure state updates propagate
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('syncFileCreated'))
        }, 100)
      }
    } catch (err) {
      setAlertState({
        isOpen: true,
        message: err instanceof Error ? err.message : 'Failed to create file',
        variant: 'error',
      })
    } finally {
      setIsCreatingFile(false)
    }
  }

  const handleDisconnectFile = () => {
    if (!pdfId) return
    setShowDisconnectConfirm(true)
  }

  const handleConfirmDisconnect = async () => {
    if (!pdfId) return
    
    setShowDisconnectConfirm(false)
    setIsDisconnecting(true)
    
    try {
      await fileSyncService.clearSyncFile()
      setSyncFileName(null)
      setLastUpdated(null)
    } catch (err) {
      setAlertState({
        isOpen: true,
        message: err instanceof Error ? err.message : 'Failed to disconnect file',
        variant: 'error',
      })
    } finally {
      setIsDisconnecting(false)
    }
  }


  return (
    <div className="space-y-6">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <button
          onClick={() => setIsStyleExpanded(!isStyleExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Style</h2>
          <svg
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isStyleExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isStyleExpanded && (
          <div className="px-4 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Appearance
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Switch between light and dark mode
                </p>
              </div>
              <button
                onClick={toggleTheme}
                type="button"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm font-medium text-gray-900 dark:text-white transition-colors flex items-center gap-2"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Light Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <button
          onClick={() => setIsLLMConfigExpanded(!isLLMConfigExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connect Your API Key</h2>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isLLMConfigExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isLLMConfigExpanded && (
          <div className="px-4 pb-4 space-y-4">
          {/* Privacy explanation */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Your API key stays on this device and is sent only to OpenAI when you ask a question. 
              We have no server, so we never receive or store your key.
            </p>
          </div>
          
          {/* Fallback mode warning */}
          {isInFallbackMode && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Your browser does not support persistent secure storage. Your API key will only be kept for this session and will need to be re-entered after closing the browser.
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setTestResult(null)
                  }}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 dark:text-blue-400 hover:underline"
              >
                Get your API key from OpenAI
              </a>
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value)
                setTestResult(null)
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {llmService.getCurrentProvider()?.getAvailableModels().map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Select which model to use for chat responses. Make sure your API key has access to the selected model.
            </p>
          </div>
          
          {/* Test result feedback */}
          {testResult && (
            <div className={`p-3 rounded-lg ${
              testResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={`text-sm ${
                  testResult.success 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {testResult.message}
                </span>
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleSaveLLM}
                disabled={isSavingLLM || !hasUnsavedLLMChanges()}
                className={`flex-1 px-4 py-2 text-white rounded transition-all duration-200 flex items-center justify-center gap-2 ${
                  showSuccessLLM
                    ? 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700'
                    : hasUnsavedLLMChanges()
                    ? 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700'
                    : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                }`}
              >
                {showSuccessLLM ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Saved</span>
                  </>
                ) : isSavingLLM ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Key</span>
                )}
              </button>
              
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !apiKey.trim()}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isTesting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Testing...</span>
                  </>
                ) : (
                  <span>Test Connection</span>
                )}
              </button>
            </div>
            
            {/* Remove key button */}
            {savedApiKey && (
              <div>
                <button
                  onClick={handleRemoveApiKey}
                  disabled={isRemoving}
                  className="w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRemoving ? 'Removing...' : 'Remove API Key'}
                </button>
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {pdfId && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <button
            onClick={() => setIsDocumentInfoExpanded(!isDocumentInfoExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Document Information</h2>
            <svg
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isDocumentInfoExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isDocumentInfoExpanded && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Document title"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Author <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={docAuthor}
                  onChange={(e) => setDocAuthor(e.target.value)}
                  placeholder="Author name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              
              {/* Save button for Document Information */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSaveDocument}
                  disabled={isSavingDocument || !hasUnsavedDocumentChanges() || !docTitle.trim() || !docAuthor.trim()}
                  className={`w-full px-4 py-2 text-white rounded transition-all duration-200 flex items-center justify-center gap-2 ${
                    showSuccessDocument
                      ? 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700'
                      : hasUnsavedDocumentChanges() && docTitle.trim() && docAuthor.trim()
                      ? 'bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700'
                      : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  {showSuccessDocument ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Saved</span>
                    </>
                  ) : isSavingDocument ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {pdfId && (
        <div ref={syncFileSectionRef} className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <button
            onClick={() => setIsSourceFileExpanded(!isSourceFileExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sync File</h2>
            <svg
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isSourceFileExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isSourceFileExpanded && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current File
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {syncFileName 
                    ? 'The file where your notes are saved and synced'
                    : 'No sync file connected. Your notes are only saved locally in this browser.'}
                </p>
                <div className="mb-2">
                  <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 break-words break-all mb-2">
                    {syncFileName || 'No file selected'}
                  </div>
                  {syncFileName && (
                    <button
                      onClick={handleDisconnectFile}
                      disabled={isDisconnecting}
                      className="w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect File'}
                    </button>
                  )}
                </div>
                {syncFileName && lastUpdated && (
                  <p 
                    className="text-sm text-gray-500 dark:text-gray-400"
                    title={lastUpdated.toLocaleString()}
                  >
                    Last updated: {formatRelativeTime(lastUpdated)}
                  </p>
                )}
              </div>

              {syncFileName ? (
                <button
                  onClick={handleChangeSourceFile}
                  disabled={isChangingFile}
                  className="w-full px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isChangingFile ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Changing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Change Sync File</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleCreateNewFile}
                    disabled={isCreatingFile}
                    className="w-full px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isCreatingFile ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create Sync File</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleChangeSourceFile}
                    disabled={isChangingFile}
                    className="w-full px-4 py-2 border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isChangingFile ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Select Existing File</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <button
          onClick={() => setIsChatInstructionsExpanded(!isChatInstructionsExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chat Instructions</h2>
          <svg
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isChatInstructionsExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isChatInstructionsExpanded && (
          <div className="px-4 pb-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              These instructions are sent to the LLM as system context to guide how it responds. 
              Customize this to control the assistant's behavior, tone, and focus areas.
            </p>
            <textarea
              value={chatInstructions}
              onChange={(e) => setChatInstructions(e.target.value)}
              placeholder="Enter system instructions for the LLM..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              rows={12}
            />
            <div className="flex justify-end mt-1">
              <div className="relative group">
                <span className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                  What's {'{{ }}'}?
                </span>
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="text-gray-300">
                    <code className="px-1 py-0.5 bg-gray-700 rounded text-gray-200">{'{{document_title}}'}</code> and <code className="px-1 py-0.5 bg-gray-700 rounded text-gray-200">{'{{document_author}}'}</code> are automatically replaced with the current document's information.
                  </div>
                  <div className="absolute top-full right-4 -mt-1">
                    <div className="w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Save button for Chat Instructions */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <button
              onClick={handleSaveInstructions}
              disabled={isSavingInstructions || !hasUnsavedInstructionsChanges()}
              className={`w-full px-4 py-2 text-white rounded transition-all duration-200 flex items-center justify-center gap-2 ${
                showSuccessInstructions
                  ? 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700'
                  : hasUnsavedInstructionsChanges()
                  ? 'bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700'
                  : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              }`}
            >
              {showSuccessInstructions ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Saved</span>
                </>
              ) : isSavingInstructions ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
            {chatInstructions !== DEFAULT_CHAT_INSTRUCTIONS && (
              <button
                onClick={() => {
                  setChatInstructions(DEFAULT_CHAT_INSTRUCTIONS)
                }}
                className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 transition-colors text-sm"
              >
                Reset to Default
              </button>
            )}
          </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Echo v{VERSION}
          {' · '}
          <button
            type="button"
            onClick={() => window.open('https://github.com/tibi-iorga/echo-reading', '_blank', 'noopener,noreferrer')}
            className="text-blue-500 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-0 p-0 font-inherit text-inherit"
          >
            GitHub
          </button>
        </p>
      </div>

      {/* Confirmation Modal for Disconnect */}
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        title="Disconnect Sync File"
        message="Are you sure you want to disconnect the sync file? Your notes will still be saved locally, but they won't sync across browsers or devices."
        confirmText="Disconnect"
        cancelText="Cancel"
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setShowDisconnectConfirm(false)}
        variant="danger"
      />

      {/* Confirmation Modal for Remove API Key */}
      <ConfirmModal
        isOpen={showRemoveApiKeyConfirm}
        title="Remove API Key"
        message="Are you sure you want to remove your API key? You will need to enter it again to use the AI chat features."
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmRemoveApiKey}
        onCancel={() => setShowRemoveApiKeyConfirm(false)}
        variant="danger"
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertState.isOpen}
        message={alertState.message}
        variant={alertState.variant}
        onClose={() => setAlertState({ isOpen: false, message: '', variant: 'error' })}
      />
    </div>
  )
}
