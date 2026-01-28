/**
 * Secure Key Storage
 * 
 * Stores API keys encrypted at rest using Web Crypto AES-GCM in IndexedDB.
 * 
 * Security notes:
 * - This protects against casual inspection (devtools, localStorage viewers, accidental logging)
 * - This does NOT protect against malicious scripts running in the page context
 * - Any XSS can still access the decrypted key by calling these functions
 * - The "non-extractable" CryptoKey flag prevents exportKey() but not decrypt()
 */

const DB_NAME = 'llm_secure_store'
const DB_VERSION = 1
const KEYS_STORE = 'keys'
const SECRETS_STORE = 'secrets'
const MASTER_KEY_ID = 'master'
const API_KEY_ID = 'llm_api_key'
const LEGACY_LOCALSTORAGE_KEY = 'llm_api_key'

// Cached database handle
let dbInstance: IDBDatabase | null = null
let initializationPromise: Promise<void> | null = null

// Fallback mode when CryptoKey cannot be stored in IndexedDB (Safari < 14.1)
let fallbackMode = false
let inMemoryKey: string | null = null

/**
 * Open or get cached IndexedDB connection
 */
async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    
    request.onsuccess = () => {
      dbInstance = request.result
      
      // Handle connection close
      dbInstance.onclose = () => {
        dbInstance = null
      }
      
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      if (!db.objectStoreNames.contains(KEYS_STORE)) {
        db.createObjectStore(KEYS_STORE)
      }
      
      if (!db.objectStoreNames.contains(SECRETS_STORE)) {
        db.createObjectStore(SECRETS_STORE)
      }
    }
  })
}

/**
 * Generate a new AES-GCM encryption key
 */
async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // non-extractable
    ['encrypt', 'decrypt']
  )
}

/**
 * Get or create the master encryption key
 */
async function getMasterKey(): Promise<CryptoKey> {
  const db = await getDB()

  // Try to get existing key
  const existingKey = await new Promise<CryptoKey | null>((resolve) => {
    const transaction = db.transaction([KEYS_STORE], 'readonly')
    const store = transaction.objectStore(KEYS_STORE)
    const request = store.get(MASTER_KEY_ID)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => resolve(null)
  })

  if (existingKey) {
    return existingKey
  }

  // Generate new key
  const newKey = await generateEncryptionKey()

  // Store it
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readwrite')
    const store = transaction.objectStore(KEYS_STORE)
    const request = store.put(newKey, MASTER_KEY_ID)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  return newKey
}

/**
 * Test if CryptoKey can be stored in IndexedDB
 * Safari < 14.1 throws DataCloneError
 */
async function canStoreCryptoKey(): Promise<boolean> {
  const testDbName = 'crypto_key_test'
  
  try {
    const testKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(testDbName, 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result
        database.createObjectStore('test')
      }
    })

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['test'], 'readwrite')
      const store = transaction.objectStore('test')
      const request = store.put(testKey, 'test')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    db.close()
    indexedDB.deleteDatabase(testDbName)
    return true
  } catch (error) {
    // Clean up test database
    try {
      indexedDB.deleteDatabase(testDbName)
    } catch {
      // Ignore cleanup errors
    }
    
    // DataCloneError means CryptoKey cannot be stored
    if (error instanceof DOMException && error.name === 'DataCloneError') {
      return false
    }
    
    // Other errors might be IndexedDB issues, assume we can try
    return true
  }
}

/**
 * Encrypt a string value
 */
async function encrypt(value: string, key: CryptoKey): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  
  // Generate fresh IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return { iv, ciphertext }
}

/**
 * Decrypt a value
 */
async function decrypt(iv: Uint8Array, ciphertext: ArrayBuffer, key: CryptoKey): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

/**
 * Initialize the secure storage system
 * Must be called before using other functions
 * Handles migration from localStorage
 */
export async function initializeSecureStorage(): Promise<void> {
  // Prevent multiple simultaneous initializations
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    try {
      // Check if we can store CryptoKey in IndexedDB
      const canStore = await canStoreCryptoKey()
      
      if (!canStore) {
        console.warn('SecureKeyStorage: Browser cannot store CryptoKey in IndexedDB. Using in-memory fallback.')
        fallbackMode = true
        
        // Migrate from localStorage to memory if present
        const legacyKey = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY)
        if (legacyKey) {
          inMemoryKey = legacyKey
          localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY)
        }
        
        return
      }

      // Initialize database and master key
      await getMasterKey()

      // Migrate from localStorage if present
      const legacyKey = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY)
      if (legacyKey) {
        await setApiKey(legacyKey)
        localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY)
      }
    } catch (error) {
      console.error('SecureKeyStorage: Initialization failed', error)
      // Fall back to in-memory mode
      fallbackMode = true
      
      // Try to migrate from localStorage
      const legacyKey = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY)
      if (legacyKey) {
        inMemoryKey = legacyKey
        localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY)
      }
    }
  })()

  return initializationPromise
}

/**
 * Check if running in fallback mode (in-memory only)
 */
export function isInFallbackMode(): boolean {
  return fallbackMode
}

/**
 * Get the stored API key
 */
export async function getApiKey(): Promise<string | null> {
  // Ensure initialized
  await initializeSecureStorage()

  if (fallbackMode) {
    return inMemoryKey
  }

  try {
    const db = await getDB()
    
    const stored = await new Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer } | null>((resolve) => {
      const transaction = db.transaction([SECRETS_STORE], 'readonly')
      const store = transaction.objectStore(SECRETS_STORE)
      const request = store.get(API_KEY_ID)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => resolve(null)
    })

    if (!stored) {
      return null
    }

    const key = await getMasterKey()
    return await decrypt(stored.iv, stored.ciphertext, key)
  } catch (error) {
    console.error('SecureKeyStorage: Failed to get API key', error)
    return null
  }
}

/**
 * Store an API key
 */
export async function setApiKey(apiKey: string): Promise<void> {
  // Ensure initialized
  await initializeSecureStorage()

  if (fallbackMode) {
    inMemoryKey = apiKey
    return
  }

  try {
    const key = await getMasterKey()
    const { iv, ciphertext } = await encrypt(apiKey, key)

    const db = await getDB()
    
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([SECRETS_STORE], 'readwrite')
      const store = transaction.objectStore(SECRETS_STORE)
      const request = store.put({ iv, ciphertext }, API_KEY_ID)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('SecureKeyStorage: Failed to set API key', error)
    throw error
  }
}

/**
 * Remove the stored API key
 */
export async function removeApiKey(): Promise<void> {
  // Ensure initialized
  await initializeSecureStorage()

  if (fallbackMode) {
    inMemoryKey = null
    return
  }

  try {
    const db = await getDB()
    
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([SECRETS_STORE], 'readwrite')
      const store = transaction.objectStore(SECRETS_STORE)
      const request = store.delete(API_KEY_ID)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('SecureKeyStorage: Failed to remove API key', error)
    throw error
  }
}

/**
 * Check if an API key is stored
 */
export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey()
  return key !== null && key.length > 0
}
