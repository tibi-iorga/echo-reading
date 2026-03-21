/**
 * Database type definitions.
 * These map to the Postgres tables in Neon.
 */

export interface BookRow {
  id: string
  clerk_user_id: string
  title: string
  author: string | null
  filename: string
  file_size: number
  storage_path: string
  cover_path: string | null
  num_pages: number | null
  created_at: string
  updated_at: string
}

export type BookInsert = Omit<BookRow, 'id' | 'created_at' | 'updated_at'>
export type BookUpdate = Partial<Omit<BookRow, 'id' | 'clerk_user_id' | 'created_at'>>

// --- Annotations ---

export interface AnnotationRow {
  id: string
  book_id: string
  clerk_user_id: string
  type: 'highlight' | 'note' | 'bookmark'
  data: Record<string, unknown> // JSONB — stores full Annotation object
  created_at: string
}

export type AnnotationInsert = Omit<AnnotationRow, 'created_at'>
export type AnnotationUpdate = Partial<Omit<AnnotationRow, 'id' | 'book_id' | 'clerk_user_id' | 'created_at'>>

// --- Canvas Content ---

export interface CanvasContentRow {
  book_id: string
  clerk_user_id: string
  content: string
  updated_at: string
}

export type CanvasContentInsert = Omit<CanvasContentRow, 'updated_at'>
export type CanvasContentUpdate = Partial<Pick<CanvasContentRow, 'content'>>

// --- Chat Messages ---

export interface ChatMessageRow {
  id: string
  book_id: string
  clerk_user_id: string
  role: 'user' | 'assistant'
  content: string
  quoted_text: string | null
  created_at: string
}

export type ChatMessageInsert = Omit<ChatMessageRow, 'created_at'>
export type ChatMessageUpdate = Partial<Omit<ChatMessageRow, 'id' | 'book_id' | 'clerk_user_id' | 'created_at'>>

// --- Reading Progress ---

export interface ReadingProgressRow {
  book_id: string
  clerk_user_id: string
  current_page: number
  furthest_page: number
  last_page_read: number
  scale: number
  updated_at: string
}

export type ReadingProgressInsert = Omit<ReadingProgressRow, 'updated_at'>
export type ReadingProgressUpdate = Partial<Omit<ReadingProgressRow, 'book_id' | 'clerk_user_id' | 'updated_at'>>

// --- User Settings ---

export interface UserSettingsRow {
  clerk_user_id: string
  active_tab: string
  is_panel_collapsed: boolean
  sidebar_width: number
  theme: string
  chat_instructions: string | null
  llm_provider: string | null
  llm_model: string | null
  updated_at: string
}

export type UserSettingsInsert = Omit<UserSettingsRow, 'updated_at'>
export type UserSettingsUpdate = Partial<Omit<UserSettingsRow, 'clerk_user_id' | 'updated_at'>>

// --- App-level types ---

export interface BookWithProgress extends BookRow {
  reading_progress: ReadingProgressRow | null
}
