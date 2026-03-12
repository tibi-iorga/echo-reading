import { getSupabase } from './supabaseClient'
import type { BookRow, BookWithProgress, ReadingProgressUpdate } from './types'
import type { Annotation } from '@/types'

/**
 * Service layer for all Supabase operations.
 * Handles books, annotations, canvas, chat messages, reading progress, and user settings.
 */

// --- Books ---

export async function listBooks(userId: string): Promise<BookWithProgress[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('books')
    .select('*, reading_progress(*)')
    .eq('clerk_user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => ({
    ...row,
    reading_progress: Array.isArray(row.reading_progress)
      ? row.reading_progress[0] ?? null
      : row.reading_progress ?? null,
  }))
}

export async function getBook(bookId: string): Promise<BookRow | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return data
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
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('books')
    .insert(book)
    .select()
    .single()

  if (error) throw error
  return data
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
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('books')
    .insert({ id, ...book })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBook(bookId: string, updates: { title?: string; author?: string | null; num_pages?: number }): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('books')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', bookId)

  if (error) throw error
}

export async function deleteBook(bookId: string, storagePath: string): Promise<void> {
  const supabase = getSupabase()

  // Delete the PDF file from storage
  const { error: storageError } = await supabase.storage
    .from('pdfs')
    .remove([storagePath])

  if (storageError) console.error('Failed to delete PDF from storage:', storageError)

  // Delete the book row (cascades to annotations, canvas, chat, progress)
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId)

  if (error) throw error
}

// --- PDF Storage ---

export async function uploadPDFToPath(storagePath: string, file: File): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase.storage
    .from('pdfs')
    .upload(storagePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (error) throw error
}

export async function updateBookStoragePath(bookId: string, storagePath: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('books')
    .update({ storage_path: storagePath, updated_at: new Date().toISOString() })
    .eq('id', bookId)

  if (error) throw error
}

export async function uploadCover(coverPath: string, blob: Blob): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.storage
    .from('pdfs')
    .upload(coverPath, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    })
  if (error) throw error
}

export async function updateBookCoverPath(bookId: string, coverPath: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('books')
    .update({ cover_path: coverPath, updated_at: new Date().toISOString() })
    .eq('id', bookId)
  if (error) throw error
}

export async function getSignedCoverUrl(coverPath: string): Promise<string> {
  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from('pdfs')
    .createSignedUrl(coverPath, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function getSignedCoverUrls(coverPaths: string[]): Promise<Map<string, string>> {
  if (coverPaths.length === 0) return new Map()
  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from('pdfs')
    .createSignedUrls(coverPaths, 3600)
  if (error) throw error
  const map = new Map<string, string>()
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) {
      map.set(item.path, item.signedUrl)
    }
  }
  return map
}

export async function getSignedPdfUrl(storagePath: string): Promise<string> {
  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from('pdfs')
    .createSignedUrl(storagePath, 3600) // 1 hour

  if (error) throw error
  return data.signedUrl
}

// --- Annotations ---

export async function getAnnotations(bookId: string): Promise<Annotation[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('annotations')
    .select('*')
    .eq('book_id', bookId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => {
    const annotation = row.data as unknown as Annotation
    // Ensure the id from the row is used (canonical)
    return { ...annotation, id: row.id }
  })
}

export async function saveAnnotations(bookId: string, userId: string, annotations: Annotation[]): Promise<void> {
  const supabase = getSupabase()

  // Delete all existing annotations for this book, then insert current set.
  // This matches the existing localStorage behavior (full array replacement).
  const { error: deleteError } = await supabase
    .from('annotations')
    .delete()
    .eq('book_id', bookId)

  if (deleteError) throw deleteError

  if (annotations.length === 0) return

  const rows = annotations.map((a) => ({
    id: a.id,
    book_id: bookId,
    clerk_user_id: userId,
    type: a.type,
    data: a as unknown as Record<string, unknown>,
  }))

  const { error: insertError } = await supabase
    .from('annotations')
    .insert(rows)

  if (insertError) throw insertError
}

export async function upsertAnnotation(
  bookId: string,
  userId: string,
  annotation: Annotation
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('annotations')
    .upsert(
      {
        id: annotation.id,
        book_id: bookId,
        clerk_user_id: userId,
        type: annotation.type,
        data: annotation as unknown as Record<string, unknown>,
      },
      { onConflict: 'id,book_id' }
    )
  if (error) throw error
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('annotations')
    .delete()
    .eq('id', annotationId)
  if (error) throw error
}

// --- Chat Messages (incremental) ---

export async function insertChatMessages(
  bookId: string,
  userId: string,
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>
): Promise<void> {
  if (messages.length === 0) return
  const supabase = getSupabase()
  const rows = messages.map((m) => ({
    id: m.id,
    book_id: bookId,
    clerk_user_id: userId,
    role: m.role,
    content: m.content,
    quoted_text: m.quotedText ?? null,
  }))
  const { error } = await supabase
    .from('chat_messages')
    .insert(rows)
  if (error) throw error
}

// --- Canvas Content ---

export async function getCanvasContent(bookId: string): Promise<string> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('canvas_content')
    .select('content')
    .eq('book_id', bookId)
    .maybeSingle()

  if (error) throw error
  return data?.content ?? ''
}

export async function saveCanvasContent(bookId: string, userId: string, content: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('canvas_content')
    .upsert(
      { book_id: bookId, clerk_user_id: userId, content },
      { onConflict: 'book_id' }
    )

  if (error) throw error
}

// --- Chat Messages ---

export async function getChatMessages(bookId: string): Promise<Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('book_id', bookId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    quotedText: row.quoted_text,
  }))
}

export async function saveChatMessages(
  bookId: string,
  userId: string,
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; quotedText?: string | null }>
): Promise<void> {
  const supabase = getSupabase()

  // Replace all messages for this book
  const { error: deleteError } = await supabase
    .from('chat_messages')
    .delete()
    .eq('book_id', bookId)

  if (deleteError) throw deleteError

  if (messages.length === 0) return

  const rows = messages.map((m) => ({
    id: m.id,
    book_id: bookId,
    clerk_user_id: userId,
    role: m.role,
    content: m.content,
    quoted_text: m.quotedText ?? null,
  }))

  const { error: insertError } = await supabase
    .from('chat_messages')
    .insert(rows)

  if (insertError) throw insertError
}

// --- Reading Progress ---

export async function getReadingProgress(bookId: string): Promise<{
  currentPage: number
  furthestPage: number
  lastPageRead: number
  scale: number
} | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('book_id', bookId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    currentPage: data.current_page,
    furthestPage: data.furthest_page,
    lastPageRead: data.last_page_read,
    scale: data.scale,
  }
}

export async function saveReadingProgress(
  bookId: string,
  userId: string,
  progress: ReadingProgressUpdate & { current_page?: number; furthest_page?: number; last_page_read?: number; scale?: number }
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('reading_progress')
    .upsert(
      {
        book_id: bookId,
        clerk_user_id: userId,
        current_page: progress.current_page ?? 1,
        furthest_page: progress.furthest_page ?? 1,
        last_page_read: progress.last_page_read ?? 1,
        scale: progress.scale ?? 1.5,
      },
      { onConflict: 'book_id' }
    )

  if (error) throw error
}

export async function updateReadingProgress(
  bookId: string,
  updates: Partial<{ current_page: number; furthest_page: number; last_page_read: number; scale: number }>
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('reading_progress')
    .update(updates)
    .eq('book_id', bookId)

  if (error) throw error
}

// --- User Settings ---

export async function getUserSettings(userId: string): Promise<{
  activeTab: string
  isPanelCollapsed: boolean
  sidebarWidth: number
  theme: string
  chatInstructions: string | null
  llmProvider: string | null
  llmModel: string | null
} | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    activeTab: data.active_tab,
    isPanelCollapsed: data.is_panel_collapsed,
    sidebarWidth: data.sidebar_width,
    theme: data.theme,
    chatInstructions: data.chat_instructions,
    llmProvider: data.llm_provider,
    llmModel: data.llm_model,
  }
}

export async function saveUserSettings(
  userId: string,
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
  const supabase = getSupabase()
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { clerk_user_id: userId, ...settings },
      { onConflict: 'clerk_user_id' }
    )

  if (error) throw error
}
