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
const MODEL_STORAGE_KEY = 'llm_model'
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
const CANVAS_STORAGE_KEY = 'pdf_canvas'

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

  getModel(): string | null {
    return localStorage.getItem(MODEL_STORAGE_KEY)
  }

  setModel(model: string): void {
    localStorage.setItem(MODEL_STORAGE_KEY, model)
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

  saveAnnotations(pdfId: string, annotations: Annotation[]): void {
    localStorage.setItem(
      `${ANNOTATIONS_STORAGE_KEY}_${pdfId}`,
      JSON.stringify(annotations)
    )
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

    // If nothing is stored yet, initialize with the default so Chat always has system context.
    // This makes first run behavior consistent between local dev and production.
    if (instructions === null) {
      localStorage.setItem(CHAT_INSTRUCTIONS_STORAGE_KEY, NEW_DEFAULT)
      return NEW_DEFAULT
    }

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

  // Canvas content (per PDF)
  getCanvasContent(pdfId: string): string {
    return localStorage.getItem(`${CANVAS_STORAGE_KEY}_${pdfId}`) ?? ''
  }

  saveCanvasContent(pdfId: string, content: string): void {
    localStorage.setItem(`${CANVAS_STORAGE_KEY}_${pdfId}`, content)
  }

  // Global UI state (tab, panel collapsed) with versioning
  getGlobalUIState(): { activeTab: 'notes' | 'chat' | 'canvas'; isPanelCollapsed: boolean } | null {
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

  saveGlobalUIState(state: { activeTab: 'notes' | 'chat' | 'canvas'; isPanelCollapsed: boolean }): void {
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

  saveFurthestPage(pdfId: string, page: number, force: boolean = false): void {
    const currentFurthest = this.getFurthestPage(pdfId)

    if (force || currentFurthest === null || page > currentFurthest) {
      localStorage.setItem(
        `${FURTHEST_PAGE_STORAGE_KEY}_${pdfId}`,
        page.toString()
      )
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

  saveLastPageRead(pdfId: string, page: number): void {
    localStorage.setItem(
      `${LAST_PAGE_READ_STORAGE_KEY}_${pdfId}`,
      page.toString()
    )
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

function migrateGlobalUIState(data: { version: number; activeTab?: string; isPanelCollapsed?: boolean }): { activeTab: 'notes' | 'chat' | 'canvas'; isPanelCollapsed: boolean } | null {
  const validTabs = ['notes', 'chat', 'canvas']

  // Migrate legacy tab names to valid current tabs
  const migrateTab = (tab: string): string => {
    if (tab === 'settings' || tab === 'document') return 'chat'
    return tab
  }

  if (data.version === CURRENT_GLOBAL_UI_STATE_VERSION) {
    if (data.activeTab) {
      const migrated = migrateTab(data.activeTab)
      if (validTabs.includes(migrated)) {
        return {
          activeTab: migrated as 'notes' | 'chat' | 'canvas',
          isPanelCollapsed: data.isPanelCollapsed ?? false,
        }
      }
    }
    return null
  }

  // If version is newer than current, return null (safety fallback)
  if (data.version > CURRENT_GLOBAL_UI_STATE_VERSION) {
    console.warn(`Global UI state version ${data.version} is newer than supported ${CURRENT_GLOBAL_UI_STATE_VERSION}. Resetting.`)
    return null
  }

  // Unknown version, try to extract state if present
  if (data.activeTab) {
    const migrated = migrateTab(data.activeTab)
    if (validTabs.includes(migrated)) {
      return {
        activeTab: migrated as 'notes' | 'chat' | 'canvas',
        isPanelCollapsed: data.isPanelCollapsed ?? false,
      }
    }
  }
  return null
}

export const storageService = new StorageService()
