/**
 * File Sync Service
 * Handles reading and writing notes to files for cross-browser persistence
 */

import type { Annotation } from '@/types'

const SYNC_FILE_NAME_STORAGE_KEY = 'notes_sync_file_name'
const INDEXEDDB_NAME = 'notes_sync_db'
const INDEXEDDB_STORE = 'file_handles'

export interface SyncFileData {
  annotations: Annotation[]
  furthestPage?: number | null
  lastPageRead?: number | null
  metadata?: { title: string; author: string | null } | null
}

class FileSyncService {
  private fileHandle: FileSystemFileHandle | null = null
  private fileName: string | null = null
  private db: IDBDatabase | null = null

  /**
   * Initialize IndexedDB and restore file handle
   */
  async initialize(): Promise<void> {
    try {
      // Open IndexedDB
      this.db = await this.openDB()

      // Try to restore file handle from IndexedDB
      const storedHandle = await this.getStoredHandle()
      const storedName = localStorage.getItem(SYNC_FILE_NAME_STORAGE_KEY)

      if (storedHandle && storedName) {
        // Verify handle is still valid
        try {
          await storedHandle.getFile()
          this.fileHandle = storedHandle
          this.fileName = storedName
        } catch {
          // Handle is invalid, clear it
          await this.clearStoredHandle()
          localStorage.removeItem(SYNC_FILE_NAME_STORAGE_KEY)
        }
      }
    } catch (error) {
      console.error('Failed to initialize file sync:', error)
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(INDEXEDDB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(INDEXEDDB_STORE)) {
          db.createObjectStore(INDEXEDDB_STORE)
        }
      }
    })
  }

  private async getStoredHandle(): Promise<FileSystemFileHandle | null> {
    if (!this.db) return null

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([INDEXEDDB_STORE], 'readonly')
      const store = transaction.objectStore(INDEXEDDB_STORE)
      const request = store.get('file_handle')

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => resolve(null)
    })
  }

  private async storeHandle(handle: FileSystemFileHandle): Promise<void> {
    if (!this.db) {
      this.db = await this.openDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([INDEXEDDB_STORE], 'readwrite')
      const store = transaction.objectStore(INDEXEDDB_STORE)
      const request = store.put(handle, 'file_handle')

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private async clearStoredHandle(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([INDEXEDDB_STORE], 'readwrite')
      const store = transaction.objectStore(INDEXEDDB_STORE)
      const request = store.delete('file_handle')

      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
    })
  }

  /**
   * Set the file handle for syncing
   */
  async setSyncFile(fileHandle: FileSystemFileHandle, fileName: string): Promise<void> {
    this.fileHandle = fileHandle
    this.fileName = fileName
    
    // Store file name in localStorage
    localStorage.setItem(SYNC_FILE_NAME_STORAGE_KEY, fileName)
    
    // Store file handle in IndexedDB (can persist FileSystemFileHandle)
    try {
      await this.storeHandle(fileHandle)
    } catch (error) {
      console.error('Failed to store file handle:', error)
    }
  }

  /**
   * Check if File System Access API is supported
   */
  isSupported(): boolean {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window
  }

  /**
   * Get current sync file name
   */
  getSyncFileName(): string | null {
    return this.fileName || localStorage.getItem(SYNC_FILE_NAME_STORAGE_KEY)
  }

  /**
   * Check if sync file is set
   */
  hasSyncFile(): boolean {
    return !!this.fileHandle || !!this.getSyncFileName()
  }

  /**
   * Read sync file data (annotations and furthest page)
   */
  async readSyncData(): Promise<SyncFileData> {
    if (!this.fileHandle) {
      return { annotations: [], furthestPage: null, lastPageRead: null, metadata: null }
    }

    try {
      const file = await this.fileHandle.getFile()
      const content = await file.text()
      
      if (!content.trim()) {
        return { annotations: [], furthestPage: null, lastPageRead: null, metadata: null }
      }

      const data = JSON.parse(content)
      
      // Backward compatibility: if it's an array, treat as old format
      if (Array.isArray(data)) {
        return { annotations: data, furthestPage: null, lastPageRead: null, metadata: null }
      }
      
      // New format: object with annotations and optionally furthestPage, lastPageRead, and metadata
      return {
        annotations: data.annotations || [],
        furthestPage: data.furthestPage ?? null,
        lastPageRead: data.lastPageRead ?? null,
        metadata: data.metadata ?? null
      }
    } catch (error) {
      console.error('Failed to read sync file:', error)
      return { annotations: [], furthestPage: null, lastPageRead: null, metadata: null }
    }
  }

  /**
   * Read annotations from sync file (backward compatibility)
   */
  async readAnnotations(): Promise<Annotation[]> {
    const syncData = await this.readSyncData()
    return syncData.annotations
  }

  /**
   * Write sync data (annotations and furthest page) to sync file
   */
  async writeSyncData(data: SyncFileData): Promise<void> {
    if (!this.fileHandle) {
      throw new Error('No sync file selected')
    }

    try {
      const writable = await this.fileHandle.createWritable()
      const content = JSON.stringify(data, null, 2)
      await writable.write(content)
      await writable.close()
    } catch (error) {
      console.error('Failed to write sync file:', error)
      throw error
    }
  }

  /**
   * Write annotations to sync file (backward compatibility)
   */
  async writeAnnotations(annotations: Annotation[]): Promise<void> {
    // Read existing sync data to preserve furthest page, lastPageRead, and metadata
    const existingData = await this.readSyncData()
    await this.writeSyncData({
      annotations,
      furthestPage: existingData.furthestPage,
      lastPageRead: existingData.lastPageRead,
      metadata: existingData.metadata
    })
  }

  /**
   * Write annotations and furthest page to sync file
   */
  async writeAnnotationsWithFurthestPage(annotations: Annotation[], furthestPage: number | null): Promise<void> {
    // Read existing sync data to preserve lastPageRead and metadata
    const existingData = await this.readSyncData()
    await this.writeSyncData({
      annotations,
      furthestPage,
      lastPageRead: existingData.lastPageRead,
      metadata: existingData.metadata
    })
  }

  /**
   * Write annotations, furthest page, and last page read to sync file
   */
  async writeAnnotationsWithPages(annotations: Annotation[], furthestPage: number | null, lastPageRead: number | null): Promise<void> {
    // Read existing sync data to preserve metadata
    const existingData = await this.readSyncData()
    await this.writeSyncData({
      annotations,
      furthestPage,
      lastPageRead,
      metadata: existingData.metadata
    })
  }

  /**
   * Request file handle for existing file
   */
  async requestFileHandle(): Promise<FileSystemFileHandle | null> {
    try {
      if (!('showOpenFilePicker' in window)) {
        throw new Error('File System Access API not supported')
      }

      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [{
          description: 'Notes files',
          accept: {
            'application/json': ['.json'],
            'text/markdown': ['.md'],
          },
        }],
        multiple: false,
      })

      return fileHandle
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        // User cancelled
        return null
      }
      console.error('Failed to request file handle:', error)
      throw error
    }
  }

  /**
   * Create new file handle
   */
  async createFileHandle(fileName: string): Promise<FileSystemFileHandle | null> {
    try {
      if (!('showSaveFilePicker' in window)) {
        throw new Error('File System Access API not supported')
      }

      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'JSON files',
          accept: {
            'application/json': ['.json'],
          },
        }],
      })

      // Initialize with empty sync data structure
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify({ annotations: [], furthestPage: null, lastPageRead: null }, null, 2))
      await writable.close()

      return fileHandle
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        // User cancelled
        return null
      }
      console.error('Failed to create file handle:', error)
      throw error
    }
  }

  /**
   * Get the last modified time of the sync file
   */
  async getLastModifiedTime(): Promise<Date | null> {
    if (!this.fileHandle) {
      return null
    }

    try {
      const file = await this.fileHandle.getFile()
      return new Date(file.lastModified)
    } catch (error) {
      console.error('Failed to get last modified time:', error)
      return null
    }
  }

  /**
   * Clear sync file
   */
  async clearSyncFile(): Promise<void> {
    this.fileHandle = null
    this.fileName = null
    localStorage.removeItem(SYNC_FILE_NAME_STORAGE_KEY)
    await this.clearStoredHandle()
  }
}

export const fileSyncService = new FileSyncService()
