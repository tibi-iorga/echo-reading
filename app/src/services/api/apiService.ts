import type { BookRow, BookWithProgress, ReadingProgressUpdate } from './types'
import type { Annotation } from '@/types'

/**
 * Service layer for all API operations.
 * Replaces supabaseService.ts — same function signatures.
 */

let tokenGetter: (() => Promise<string | null>) | null = null

export function initApiService(getToken: () => Promise<string | null>) {
  tokenGetter = getToken
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await tokenGetter?.()
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API error ${res.status}`)
  }
  return res
}

// --- Books ---

export async function listBooks(_userId: string): Promise<BookWithProgress[]> {
  const res = await authFetch('/books')
  return res.json()
}

export async function getBook(bookId: string): Promise<BookRow | null> {
  try {
    const res = await authFetch(`/books/${bookId}`)
    return res.json()
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null
    throw err
  }
}

export async function createBook(book: {
  clerk_user_id: string
  title: string
  author: string | null
  filename: string
  file_size: number
  storage_path: string
  num_pages: number | null
}): Promise<BookRow> {
  const res = await authFetch('/books', {
    method: 'POST',
    body: JSON.stringify(book),
  })
  return res.json()
}

export async function createBookWithId(id: string, book: {
  clerk_user_id: string
  title: string
  author: string | null
  filename: string
  file_size: number
  storage_path: string
  cover_path: string | null
  num_pages: number | null
}): Promise<BookRow> {
  const res = await authFetch('/books', {
    method: 'POST',
    body: JSON.stringify({ id, ...book }),
  })
  return res.json()
}

export async function updateBook(bookId: string, updates: { title?: string; author?: string | null; num_pages?: number }): Promise<void> {
  await authFetch(`/books/${bookId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function deleteBook(bookId: string, _storagePath: string): Promise<void> {
  await authFetch(`/books/${bookId}`, { method: 'DELETE' })
}

// --- PDF Storage ---

export async function uploadPDFToPath(storagePath: string, file: File): Promise<void> {
  // Get presigned URL from our API
  const res = await authFetch('/storage/upload', {
    method: 'POST',
    body: JSON.stringify({ path: storagePath, contentType: 'application/pdf' }),
  })
  const { presignedUrl } = await res.json()

  // Upload directly to R2
  await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'application/pdf' },
  })
}

export async function updateBookStoragePath(bookId: string, storagePath: string): Promise<void> {
  await authFetch(`/books/${bookId}`, {
    method: 'PATCH',
    body: JSON.stringify({ storage_path: storagePath }),
  })
}

export async function uploadCover(coverPath: string, blob: Blob): Promise<void> {
  // Get presigned URL from our API
  const res = await authFetch('/storage/upload', {
    method: 'POST',
    body: JSON.stringify({ path: coverPath, contentType: 'image/jpeg' }),
  })
  const { presignedUrl } = await res.json()

  // Upload directly to R2
  await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': 'image/jpeg' },
  })
}

export async function updateBookCoverPath(bookId: string, coverPath: string): Promise<void> {
  await authFetch(`/books/${bookId}`, {
    method: 'PATCH',
    body: JSON.stringify({ cover_path: coverPath }),
  })
}

export async function getSignedCoverUrl(coverPath: string): Promise<string> {
  const res = await authFetch(`/storage/signed-url?path=${encodeURIComponent(coverPath)}`)
  const data = await res.json()
  return data.signedUrl
}

export async function getSignedCoverUrls(coverPaths: string[]): Promise<Map<string, string>> {
  if (coverPaths.length === 0) return new Map()

  const res = await authFetch('/storage/signed-urls', {
    method: 'POST',
    body: JSON.stringify({ paths: coverPaths }),
  })
  const data = await res.json()

  const map = new Map<string, string>()
  for (const [path, url] of Object.entries(data.urls)) {
    map.set(path, url as string)
  }
  return map
}

export async function getSignedPdfUrl(storagePath: string): Promise<string> {
  const res = await authFetch(`/storage/signed-url?path=${encodeURIComponent(storagePath)}`)
  const data = await res.json()
  return data.signedUrl
}

// --- Annotations ---

export async function getAnnotations(bookId: string): Promise<Annotation[]> {
  const res = await authFetch(`/annotations/${bookId}`)
  return res.json()
}

export async function saveAnnotations(bookId: string, _userId: string, annotations: Annotation[]): Promise<void> {
  await authFetch(`/annotations/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify({ annotations }),
  })
}

export async function upsertAnnotation(
  bookId: string,
  _userId: string,
  annotation: Annotation
): Promise<void> {
  await authFetch(`/annotations/${bookId}`, {
    method: 'POST',
    body: JSON.stringify(annotation),
  })
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  // We need a bookId for the route, but the old API didn't require one.
  // The server-side will match by annotationId + userId across all books.
  await authFetch(`/annotations/_?annotationId=${encodeURIComponent(annotationId)}`, {
    method: 'DELETE',
  })
}

// --- Chat Messages (incremental) ---

export async function insertChatMessages(
  bookId: string,
  _userId: string,
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>
): Promise<void> {
  if (messages.length === 0) return
  await authFetch(`/chat/${bookId}`, {
    method: 'POST',
    body: JSON.stringify({ messages }),
  })
}

// --- Canvas Content ---

export async function getCanvasContent(bookId: string): Promise<string> {
  const res = await authFetch(`/canvas/${bookId}`)
  const data = await res.json()
  return data.content
}

export async function saveCanvasContent(bookId: string, _userId: string, content: string): Promise<void> {
  await authFetch(`/canvas/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  })
}

// --- Chat Messages ---

export async function getChatMessages(bookId: string): Promise<Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>> {
  const res = await authFetch(`/chat/${bookId}`)
  return res.json()
}

export async function saveChatMessages(
  bookId: string,
  _userId: string,
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>
): Promise<void> {
  await authFetch(`/chat/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify({ messages }),
  })
}

// --- Reading Progress ---

export async function getReadingProgress(bookId: string): Promise<{
  currentPage: number
  furthestPage: number
  lastPageRead: number
  scale: number
} | null> {
  const res = await authFetch(`/progress/${bookId}`)
  return res.json()
}

export async function saveReadingProgress(
  bookId: string,
  _userId: string,
  progress: ReadingProgressUpdate & { current_page?: number; furthest_page?: number; last_page_read?: number; scale?: number }
): Promise<void> {
  await authFetch(`/progress/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify(progress),
  })
}

export async function updateReadingProgress(
  bookId: string,
  updates: Partial<{ current_page: number; furthest_page: number; last_page_read: number; scale: number }>
): Promise<void> {
  await authFetch(`/progress/${bookId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

// --- User Settings ---

export async function getUserSettings(_userId: string): Promise<{
  activeTab: string
  isPanelCollapsed: boolean
  sidebarWidth: number
  theme: string
  chatInstructions: string | null
  llmProvider: string | null
  llmModel: string | null
} | null> {
  const res = await authFetch('/settings')
  return res.json()
}

export async function saveUserSettings(
  _userId: string,
  settings: Partial<{
    active_tab: string
    is_panel_collapsed: boolean
    sidebar_width: number
    theme: string
    chat_instructions: string | null
    llm_provider: string | null
    llm_model: string | null
  }>
): Promise<void> {
  await authFetch('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}
