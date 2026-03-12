-- Echo Reading — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables.

-- Books (PDFs stored in Supabase Storage)
CREATE TABLE books (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  title         text NOT NULL,
  author        text,
  filename      text NOT NULL,
  file_size     bigint NOT NULL,
  storage_path  text NOT NULL UNIQUE,
  num_pages     integer,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Annotations (highlights, notes, bookmarks) — one row per annotation
CREATE TABLE annotations (
  id            text NOT NULL,
  book_id       uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  type          text NOT NULL CHECK (type IN ('highlight', 'note', 'bookmark')),
  data          jsonb NOT NULL,
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY (id, book_id)
);

-- Canvas content (TipTap content per book)
CREATE TABLE canvas_content (
  book_id       uuid PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  content       text NOT NULL DEFAULT '',
  updated_at    timestamptz DEFAULT now()
);

-- Chat messages per book
CREATE TABLE chat_messages (
  id            text NOT NULL,
  book_id       uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  role          text NOT NULL CHECK (role IN ('user', 'assistant')),
  content       text NOT NULL,
  quoted_text   text,
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY (id, book_id)
);

-- Reading progress per book
CREATE TABLE reading_progress (
  book_id         uuid PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  clerk_user_id   text NOT NULL,
  current_page    integer NOT NULL DEFAULT 1,
  furthest_page   integer NOT NULL DEFAULT 1,
  last_page_read  integer NOT NULL DEFAULT 1,
  scale           numeric(4,2) DEFAULT 1.5,
  updated_at      timestamptz DEFAULT now()
);

-- Global user settings (not per-book)
CREATE TABLE user_settings (
  clerk_user_id       text PRIMARY KEY,
  active_tab          text DEFAULT 'chat',
  is_panel_collapsed  boolean DEFAULT false,
  sidebar_width       integer DEFAULT 384,
  theme               text DEFAULT 'light',
  chat_instructions   text,
  llm_provider        text,
  llm_model           text,
  updated_at          timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_books_user ON books(clerk_user_id);
CREATE INDEX idx_books_updated ON books(clerk_user_id, updated_at DESC);
CREATE INDEX idx_annotations_book ON annotations(book_id);
CREATE INDEX idx_chat_messages_book ON chat_messages(book_id, created_at);

-- Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies — users can only access their own data
-- Uses Clerk JWT sub claim as the user identifier

CREATE POLICY "Users access own books" ON books
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users access own annotations" ON annotations
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users access own canvas" ON canvas_content
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users access own chat" ON chat_messages
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users access own progress" ON reading_progress
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users access own settings" ON user_settings
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- Storage bucket policies (run separately in Supabase dashboard or via API)
-- Bucket name: "pdfs" (private, no public access)
--
-- INSERT policy:
--   bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
--
-- SELECT policy:
--   bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
--
-- DELETE policy:
--   bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
