import { z } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extract and validate bookId from query params. Returns bookId or sends 400 and returns null. */
export function parseBookId(req: VercelRequest, res: VercelResponse): string | null {
  const bookId = req.query.bookId as string;
  if (!bookId || !UUID_RE.test(bookId)) {
    res.status(400).json({ error: "Invalid or missing bookId (must be a UUID)" });
    return null;
  }
  return bookId;
}

/** Parse request body with a Zod schema. Returns parsed data or sends 400 and returns null. */
export function parseBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
  res: VercelResponse
): z.infer<T> | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    res.status(400).json({ error: "Validation failed", details: messages });
    return null;
  }
  return result.data;
}

// --- Books ---

export const CreateBookSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  author: z.string().max(500).nullable().optional(),
  filename: z.string().min(1).max(500),
  file_size: z.number().positive(),
  storage_path: z.string().min(1).max(1000),
  cover_path: z.string().max(1000).nullable().optional(),
  num_pages: z.number().int().positive().nullable().optional(),
});

export const UpdateBookSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  author: z.string().max(500).nullable().optional(),
  num_pages: z.number().int().positive().nullable().optional(),
  storage_path: z.string().min(1).max(1000).optional(),
  cover_path: z.string().max(1000).nullable().optional(),
});

// --- Annotations ---

export const AnnotationSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum(["highlight", "note", "bookmark"]),
}).passthrough(); // allow extra JSONB fields

export const AnnotationListSchema = z.object({
  annotations: z.array(AnnotationSchema).max(10000),
});

// --- Chat ---

const ChatMessageSchema = z.object({
  id: z.string().min(1).max(200),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(100000),
  quotedText: z.string().max(10000).nullable().optional(),
});

export const ChatMessagesSchema = z.object({
  messages: z.array(ChatMessageSchema).max(5000),
});

// --- Canvas ---

export const CanvasContentSchema = z.object({
  content: z.string().max(500000),
});

// --- Reading Progress ---

export const ProgressUpsertSchema = z.object({
  current_page: z.number().int().min(1).optional(),
  furthest_page: z.number().int().min(1).optional(),
  last_page_read: z.number().int().min(1).optional(),
  scale: z.number().positive().max(10).optional(),
});

// --- Settings ---

export const SettingsSchema = z.object({
  active_tab: z.string().max(50).optional(),
  is_panel_collapsed: z.boolean().optional(),
  sidebar_width: z.number().int().min(100).max(2000).optional(),
  theme: z.string().max(20).optional(),
  chat_instructions: z.string().max(5000).nullable().optional(),
  llm_provider: z.string().max(50).nullable().optional(),
  llm_model: z.string().max(100).nullable().optional(),
});

// --- Storage ---

export const UploadSchema = z.object({
  path: z.string().min(1).max(1000),
  contentType: z.string().min(1).max(200),
});

export const SignedUrlsSchema = z.object({
  paths: z.array(z.string().max(1000)).max(100),
});
