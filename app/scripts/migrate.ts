/**
 * Migration script: Supabase → Neon + R2
 *
 * Migrates all database rows and storage files.
 * Run with: npx tsx scripts/migrate.ts
 */

import { createClient } from "@supabase/supabase-js";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as schema from "../api/_lib/schema";

// --- Config ---

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!; // Need service role key for full access
const DATABASE_URL = process.env.DATABASE_URL!;
const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;

// --- Clients ---

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// --- Helpers ---

function log(msg: string) {
  console.log(`[migrate] ${msg}`);
}

// --- Migration ---

async function migrateDatabase() {
  log("=== DATABASE MIGRATION ===");

  // 1. Books
  const { data: books, error: booksErr } = await supabase.from("books").select("*");
  if (booksErr) throw booksErr;
  log(`Found ${books.length} books`);

  for (const book of books) {
    await db.insert(schema.books).values({
      id: book.id,
      clerkUserId: book.clerk_user_id,
      title: book.title,
      author: book.author,
      filename: book.filename,
      fileSize: book.file_size,
      storagePath: book.storage_path,
      coverPath: book.cover_path,
      numPages: book.num_pages,
      createdAt: new Date(book.created_at),
      updatedAt: new Date(book.updated_at),
    }).onConflictDoNothing();
    log(`  ✓ Book: ${book.title}`);
  }

  // 2. Annotations
  const { data: annotations, error: annErr } = await supabase.from("annotations").select("*");
  if (annErr) throw annErr;
  log(`Found ${annotations.length} annotations`);

  for (const ann of annotations) {
    await db.insert(schema.annotations).values({
      id: ann.id,
      bookId: ann.book_id,
      clerkUserId: ann.clerk_user_id,
      type: ann.type,
      data: ann.data,
      createdAt: new Date(ann.created_at),
    }).onConflictDoNothing();
  }
  log(`  ✓ ${annotations.length} annotations migrated`);

  // 3. Canvas content
  const { data: canvases, error: canvasErr } = await supabase.from("canvas_content").select("*");
  if (canvasErr) throw canvasErr;
  log(`Found ${canvases.length} canvas entries`);

  for (const canvas of canvases) {
    await db.insert(schema.canvasContent).values({
      bookId: canvas.book_id,
      clerkUserId: canvas.clerk_user_id,
      content: canvas.content,
      updatedAt: new Date(canvas.updated_at),
    }).onConflictDoNothing();
  }
  log(`  ✓ ${canvases.length} canvas entries migrated`);

  // 4. Chat messages
  const { data: messages, error: chatErr } = await supabase.from("chat_messages").select("*");
  if (chatErr) throw chatErr;
  log(`Found ${messages.length} chat messages`);

  for (const msg of messages) {
    await db.insert(schema.chatMessages).values({
      id: msg.id,
      bookId: msg.book_id,
      clerkUserId: msg.clerk_user_id,
      role: msg.role,
      content: msg.content,
      quotedText: msg.quoted_text,
      createdAt: new Date(msg.created_at),
    }).onConflictDoNothing();
  }
  log(`  ✓ ${messages.length} chat messages migrated`);

  // 5. Reading progress
  const { data: progress, error: progErr } = await supabase.from("reading_progress").select("*");
  if (progErr) throw progErr;
  log(`Found ${progress.length} reading progress entries`);

  for (const prog of progress) {
    await db.insert(schema.readingProgress).values({
      bookId: prog.book_id,
      clerkUserId: prog.clerk_user_id,
      currentPage: prog.current_page,
      furthestPage: prog.furthest_page,
      lastPageRead: prog.last_page_read,
      scale: String(prog.scale),
      updatedAt: new Date(prog.updated_at),
    }).onConflictDoNothing();
  }
  log(`  ✓ ${progress.length} reading progress entries migrated`);

  // 6. User settings
  const { data: settings, error: settingsErr } = await supabase.from("user_settings").select("*");
  if (settingsErr) throw settingsErr;
  log(`Found ${settings.length} user settings entries`);

  for (const s of settings) {
    await db.insert(schema.userSettings).values({
      clerkUserId: s.clerk_user_id,
      activeTab: s.active_tab,
      isPanelCollapsed: s.is_panel_collapsed,
      sidebarWidth: s.sidebar_width,
      theme: s.theme,
      chatInstructions: s.chat_instructions,
      llmProvider: s.llm_provider,
      llmModel: s.llm_model,
      updatedAt: new Date(s.updated_at),
    }).onConflictDoNothing();
  }
  log(`  ✓ ${settings.length} user settings migrated`);
}

async function migrateStorage() {
  log("=== STORAGE MIGRATION ===");

  // List all files in the pdfs bucket
  const { data: files, error: listErr } = await supabase.storage.from("pdfs").list("", {
    limit: 1000,
  });
  if (listErr) throw listErr;

  // The bucket is organized as {userId}/... so we need to list recursively
  // First get the top-level folders (user IDs)
  const folders = files?.filter((f) => f.id === null) ?? [];
  const topFiles = files?.filter((f) => f.id !== null) ?? [];

  log(`Found ${folders.length} user folders and ${topFiles.length} top-level files`);

  // Process each user folder
  for (const folder of folders) {
    const { data: userFiles, error: userErr } = await supabase.storage
      .from("pdfs")
      .list(folder.name, { limit: 1000 });
    if (userErr) {
      log(`  ✗ Error listing ${folder.name}: ${userErr.message}`);
      continue;
    }

    for (const file of userFiles ?? []) {
      if (file.id === null) continue; // skip sub-folders
      const path = `${folder.name}/${file.name}`;
      await migrateFile(path);
    }
  }
}

async function migrateFile(path: string) {
  try {
    // Download from Supabase
    const { data, error } = await supabase.storage.from("pdfs").download(path);
    if (error) {
      log(`  ✗ Download failed for ${path}: ${error.message}`);
      return;
    }

    // Determine content type
    const contentType = path.endsWith(".pdf")
      ? "application/pdf"
      : path.endsWith(".jpg") || path.endsWith(".jpeg")
      ? "image/jpeg"
      : "application/octet-stream";

    // Upload to R2
    const buffer = Buffer.from(await data.arrayBuffer());
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        Body: buffer,
        ContentType: contentType,
      })
    );

    log(`  ✓ ${path} (${(buffer.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    log(`  ✗ Error migrating ${path}: ${err}`);
  }
}

// --- Run ---

async function main() {
  log("Starting migration...");
  log("");

  await migrateDatabase();
  log("");

  await migrateStorage();
  log("");

  log("=== MIGRATION COMPLETE ===");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
