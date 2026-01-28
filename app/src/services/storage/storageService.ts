import {
  getApiKey as getSecureApiKey,
  setApiKey as setSecureApiKey,
  removeApiKey as removeSecureApiKey,
  hasApiKey as hasSecureApiKey,
  initializeSecureStorage,
  isInFallbackMode,
} from './secureKeyStorage'
import type { Annotation } from '@/types'

const PROVIDER_STORAGE_KEY = 'llm_provider'
const ANNOTATIONS_STORAGE_KEY = 'pdf_annotations'
const CHAT_INSTRUCTIONS_STORAGE_KEY = 'llm_chat_instructions'
const DOCUMENT_METADATA_STORAGE_KEY = 'pdf_document_metadata'
const CHAT_MESSAGES_STORAGE_KEY = 'pdf_chat_messages'
const UI_STATE_STORAGE_KEY = 'pdf_ui_state'
const GLOBAL_UI_STATE_STORAGE_KEY = 'global_ui_state'
const FURTHEST_PAGE_STORAGE_KEY = 'pdf_furthest_page'
const LAST_PAGE_READ_STORAGE_KEY = 'pdf_last_page_read'
const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebar_width'
const THEME_STORAGE_KEY = 'app_theme'
const DISMISSED_WARNING_STORAGE_KEY = 'dismissed_sync_warning'

// Current data structure versions
const CURRENT_CHAT_MESSAGES_VERSION = 1
const CURRENT_UI_STATE_VERSION = 1
const CURRENT_GLOBAL_UI_STATE_VERSION = 1

class StorageService {
  /**
   * Initialize secure storage (must be called at app startup)
   */
  async initialize(): Promise<void> {
    await initializeSecureStorage()
  }

  /**
   * Check if running in fallback mode (in-memory only, key lost on reload)
   */
  isApiKeyInFallbackMode(): boolean {
    return isInFallbackMode()
  }

  /**
   * Get the stored API key (async - uses encrypted IndexedDB storage)
   */
  async getApiKey(): Promise<string | null> {
    return getSecureApiKey()
  }

  /**
   * Store an API key (async - uses encrypted IndexedDB storage)
   */
  async setApiKey(apiKey: string): Promise<void> {
    await setSecureApiKey(apiKey)
  }

  /**
   * Remove the stored API key
   */
  async removeApiKey(): Promise<void> {
    await removeSecureApiKey()
  }

  /**
   * Check if an API key is stored
   */
  async hasApiKey(): Promise<boolean> {
    return hasSecureApiKey()
  }

  getProvider(): string | null {
    return localStorage.getItem(PROVIDER_STORAGE_KEY)
  }

  setProvider(provider: string): void {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider)
  }

  getAnnotations(pdfId: string): Annotation[] {
    const stored = localStorage.getItem(`${ANNOTATIONS_STORAGE_KEY}_${pdfId}`)
    if (!stored) return []
    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  async saveAnnotations(pdfId: string, annotations: Annotation[]): Promise<void> {
    // Save to localStorage
    localStorage.setItem(
      `${ANNOTATIONS_STORAGE_KEY}_${pdfId}`,
      JSON.stringify(annotations)
    )
    
    // Sync to file if file sync is enabled
    try {
      const { fileSyncService } = await import('@/services/fileSync/fileSyncService')
      if (fileSyncService.hasSyncFile()) {
        // Get current page values and metadata to save to sync file
        const furthestPage = this.getFurthestPage(pdfId)
        const lastPageRead = this.getLastPageRead(pdfId)
        const metadata = this.getDocumentMetadata(pdfId)
        const syncData = { annotations, furthestPage, lastPageRead, metadata }
        await fileSyncService.writeSyncData(syncData)
      }
    } catch (error) {
      // File sync failed, but localStorage save succeeded
      console.warn('Failed to sync annotations to file:', error)
    }
  }

  getChatInstructions(): string | null {
    const instructions = localStorage.getItem(CHAT_INSTRUCTIONS_STORAGE_KEY)
    
    // Migrate old default instructions to new default with document placeholders
    const OLD_DEFAULT = `You are a helpful reading assistant for someone reading non-fiction PDFs. Your role is to help users deeply understand the material they are reading.

When users share text from their PDF:
- Provide clear, accurate explanations
- Help clarify complex concepts
- Connect ideas to broader themes when relevant
- Ask follow-up questions if the user's question is unclear
- Be concise but thorough

The user is actively reading and learning, so prioritize clarity and understanding over brevity.`

    const NEW_DEFAULT = `You are a helpful reading assistant. The user is currently reading "{{document_title}}"{{document_author}}.

Your role is to help users deeply understand the material they are reading.

When users share text from their PDF:
- Provide clear, accurate explanations
- Help clarify complex concepts
- Connect ideas to broader themes when relevant
- Ask follow-up questions if the user's question is unclear
- Be concise but thorough

The user is actively reading and learning, so prioritize clarity and understanding over brevity.`

    if (instructions === OLD_DEFAULT) {
      localStorage.setItem(CHAT_INSTRUCTIONS_STORAGE_KEY, NEW_DEFAULT)
      return NEW_DEFAULT
    }
    
    return instructions
  }

  setChatInstructions(instructions: string): void {
    localStorage.setItem(CHAT_INSTRUCTIONS_STORAGE_KEY, instructions)
  }

  getDocumentMetadata(pdfId: string): { title: string; author: string | null } | null {
    const stored = localStorage.getItem(`${DOCUMENT_METADATA_STORAGE_KEY}_${pdfId}`)
    if (!stored) return null
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }

  setDocumentMetadata(pdfId: string, metadata: { title: string; author: string | null }): void {
    localStorage.setItem(
      `${DOCUMENT_METADATA_STORAGE_KEY}_${pdfId}`,
      JSON.stringify(metadata)
    )
  }

  // Chat messages with versioning
  getChatMessages(pdfId: string): Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }> {
    const stored = localStorage.getItem(`${CHAT_MESSAGES_STORAGE_KEY}_${pdfId}`)
    if (!stored) return []
    try {
      const data = JSON.parse(stored)
      // Handle versioned data or legacy format
      if (data.version !== undefined) {
        return migrateChatMessages(data)
      }
      // Legacy format: assume it's an array of messages
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }

  saveChatMessages(pdfId: string, messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>): void {
    const versionedData = {
      version: CURRENT_CHAT_MESSAGES_VERSION,
      messages,
    }
    localStorage.setItem(
      `${CHAT_MESSAGES_STORAGE_KEY}_${pdfId}`,
      JSON.stringify(versionedData)
    )
  }

  // UI state (page, scale) with versioning
  getUIState(pdfId: string): { currentPage: number; scale: number } | null {
    const stored = localStorage.getItem(`${UI_STATE_STORAGE_KEY}_${pdfId}`)
    if (!stored) return null
    try {
      const data = JSON.parse(stored)
      // Handle versioned data or legacy format
      if (data.version !== undefined) {
        return migrateUIState(data)
      }
      // Legacy format: assume it's the state object directly
      return data.currentPage !== undefined ? data : null
    } catch {
      return null
    }
  }

  saveUIState(pdfId: string, state: { currentPage: number; scale: number }): void {
    const versionedData = {
      version: CURRENT_UI_STATE_VERSION,
      ...state,
    }
    localStorage.setItem(
      `${UI_STATE_STORAGE_KEY}_${pdfId}`,
      JSON.stringify(versionedData)
    )
  }

  // Global UI state (tab, panel collapsed) with versioning
  getGlobalUIState(): { activeTab: 'notes' | 'chat' | 'settings'; isPanelCollapsed: boolean } | null {
    const stored = localStorage.getItem(GLOBAL_UI_STATE_STORAGE_KEY)
    if (!stored) return null
    try {
      const data = JSON.parse(stored)
      // Handle versioned data or legacy format
      if (data.version !== undefined) {
        return migrateGlobalUIState(data)
      }
      // Legacy format: assume it's the state object directly
      return data.activeTab !== undefined ? data : null
    } catch {
      return null
    }
  }

  saveGlobalUIState(state: { activeTab: 'notes' | 'chat' | 'settings'; isPanelCollapsed: boolean }): void {
    const versionedData = {
      version: CURRENT_GLOBAL_UI_STATE_VERSION,
      ...state,
    }
    localStorage.setItem(
      GLOBAL_UI_STATE_STORAGE_KEY,
      JSON.stringify(versionedData)
    )
  }

  // Furthest page tracking
  getFurthestPage(pdfId: string): number | null {
    const stored = localStorage.getItem(`${FURTHEST_PAGE_STORAGE_KEY}_${pdfId}`)
    if (!stored) return null
    try {
      const page = parseInt(stored, 10)
      return isNaN(page) ? null : page
    } catch {
      return null
    }
  }

  async saveFurthestPage(pdfId: string, page: number, force: boolean = false): Promise<void> {
    // Check sync file first (source of truth) if it exists
    let syncFileFurthestPage: number | null = null
    try {
      const { fileSyncService } = await import('@/services/fileSync/fileSyncService')
      if (fileSyncService.hasSyncFile()) {
        const syncData = await fileSyncService.readSyncData()
        syncFileFurthestPage = syncData.furthestPage ?? null
      }
    } catch (error) {
      // If sync file check fails, fall back to localStorage
      console.warn('Failed to read sync file for furthest page check:', error)
    }

    // Use sync file value as source of truth, fall back to localStorage if no sync file
    const currentFurthest = syncFileFurthestPage !== null ? syncFileFurthestPage : this.getFurthestPage(pdfId)
    
    // Only update if the new page is further than the current furthest page, unless forced (e.g., from sync file)
    if (force || currentFurthest === null || page > currentFurthest) {
      localStorage.setItem(
        `${FURTHEST_PAGE_STORAGE_KEY}_${pdfId}`,
        page.toString()
      )
      // Sync to file if file sync is enabled
      try {
        const { fileSyncService } = await import('@/services/fileSync/fileSyncService')
        if (fileSyncService.hasSyncFile()) {
          const annotations = this.getAnnotations(pdfId)
          const furthestPage = this.getFurthestPage(pdfId)
          const lastPageRead = this.getLastPageRead(pdfId)
          await fileSyncService.writeAnnotationsWithPages(annotations, furthestPage, lastPageRead)
        }
      } catch (error) {
        console.warn('Failed to sync furthest page to file:', error)
      }
    }
  }

  // Last page read tracking
  getLastPageRead(pdfId: string): number | null {
    const stored = localStorage.getItem(`${LAST_PAGE_READ_STORAGE_KEY}_${pdfId}`)
    if (!stored) return null
    try {
      const page = parseInt(stored, 10)
      return isNaN(page) ? null : page
    } catch {
      return null
    }
  }

  async saveLastPageRead(pdfId: string, page: number): Promise<void> {
    localStorage.setItem(
      `${LAST_PAGE_READ_STORAGE_KEY}_${pdfId}`,
      page.toString()
    )
    // Sync to file if file sync is enabled
    try {
      const { fileSyncService } = await import('@/services/fileSync/fileSyncService')
      if (fileSyncService.hasSyncFile()) {
        const annotations = this.getAnnotations(pdfId)
        const furthestPage = this.getFurthestPage(pdfId)
        const lastPageRead = this.getLastPageRead(pdfId)
        await fileSyncService.writeAnnotationsWithPages(annotations, furthestPage, lastPageRead)
      }
    } catch (error) {
      console.warn('Failed to sync last page read to file:', error)
    }
  }

  // Sidebar width preference
  getSidebarWidth(): number {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
    if (!stored) return 384 // Default: w-96 = 384px
    try {
      const width = parseInt(stored, 10)
      return isNaN(width) ? 384 : width
    } catch {
      return 384
    }
  }

  saveSidebarWidth(width: number): void {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, width.toString())
  }

  // Theme preference
  getTheme(): 'light' | 'dark' | null {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
    return null
  }

  saveTheme(theme: 'light' | 'dark'): void {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }

  // Dismissed warning state (per PDF ID)
  isWarningDismissed(pdfId: string | null): boolean {
    if (!pdfId) return false
    const stored = localStorage.getItem(`${DISMISSED_WARNING_STORAGE_KEY}_${pdfId}`)
    return stored === 'true'
  }

  setWarningDismissed(pdfId: string | null, dismissed: boolean): void {
    if (!pdfId) return
    if (dismissed) {
      localStorage.setItem(`${DISMISSED_WARNING_STORAGE_KEY}_${pdfId}`, 'true')
    } else {
      localStorage.removeItem(`${DISMISSED_WARNING_STORAGE_KEY}_${pdfId}`)
    }
  }
}

// Chat message type for internal use
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }

// Migration functions - upgrade old data structures to current version
function migrateChatMessages(data: { version: number; messages?: ChatMessage[] }): ChatMessage[] {
  if (data.version === CURRENT_CHAT_MESSAGES_VERSION) {
    return data.messages || []
  }
  
  // Future migrations go here
  // Example: if (data.version === 1) { return migrateFromV1ToV2(data) }
  
  // If version is newer than current, return empty (safety fallback)
  if (data.version > CURRENT_CHAT_MESSAGES_VERSION) {
    console.warn(`Chat messages version ${data.version} is newer than supported ${CURRENT_CHAT_MESSAGES_VERSION}. Resetting.`)
    return []
  }
  
  // Unknown version, try to extract messages if present
  return data.messages || []
}

function migrateUIState(data: { version: number; currentPage?: number; scale?: number }): { currentPage: number; scale: number } | null {
  if (data.version === CURRENT_UI_STATE_VERSION) {
    if (data.currentPage !== undefined && data.scale !== undefined) {
      return { currentPage: data.currentPage, scale: data.scale }
    }
    return null
  }
  
  // Future migrations go here
  // Example: if (data.version === 1) { return migrateFromV1ToV2(data) }
  
  // If version is newer than current, return null (safety fallback)
  if (data.version > CURRENT_UI_STATE_VERSION) {
    console.warn(`UI state version ${data.version} is newer than supported ${CURRENT_UI_STATE_VERSION}. Resetting.`)
    return null
  }
  
  // Unknown version, try to extract state if present
  if (data.currentPage !== undefined && data.scale !== undefined) {
    return { currentPage: data.currentPage, scale: data.scale }
  }
  return null
}

function migrateGlobalUIState(data: { version: number; activeTab?: string; isPanelCollapsed?: boolean }): { activeTab: 'notes' | 'chat' | 'settings'; isPanelCollapsed: boolean } | null {
  if (data.version === CURRENT_GLOBAL_UI_STATE_VERSION) {
    if (data.activeTab && ['notes', 'chat', 'settings'].includes(data.activeTab)) {
      return {
        activeTab: data.activeTab as 'notes' | 'chat' | 'settings',
        isPanelCollapsed: data.isPanelCollapsed ?? false,
      }
    }
    return null
  }
  
  // Future migrations go here
  // Example: if (data.version === 1) { return migrateFromV1ToV2(data) }
  
  // If version is newer than current, return null (safety fallback)
  if (data.version > CURRENT_GLOBAL_UI_STATE_VERSION) {
    console.warn(`Global UI state version ${data.version} is newer than supported ${CURRENT_GLOBAL_UI_STATE_VERSION}. Resetting.`)
    return null
  }
  
  // Unknown version, try to extract state if present
  if (data.activeTab && ['notes', 'chat', 'settings'].includes(data.activeTab)) {
    return {
      activeTab: data.activeTab as 'notes' | 'chat' | 'settings',
      isPanelCollapsed: data.isPanelCollapsed ?? false,
    }
  }
  return null
}

export const storageService = new StorageService()
