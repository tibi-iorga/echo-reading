import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth";
import { db } from "../_lib/db";
import { books } from "../_lib/schema";
import { r2, R2_BUCKET } from "../_lib/r2";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { eq, and } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req.headers.authorization);
    const bookId = req.query.bookId as string;

    if (req.method === "GET") {
      const result = await db
        .select()
        .from(books)
        .where(and(eq(books.id, bookId), eq(books.clerkUserId, userId)))
        .limit(1);

      if (result.length === 0) return res.status(404).json({ error: "Book not found" });
      return res.status(200).json(result[0]);
    }

    if (req.method === "PATCH") {
      const { title, author, num_pages, storage_path, cover_path } = req.body;
      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (title !== undefined) updates.title = title;
      if (author !== undefined) updates.author = author;
      if (num_pages !== undefined) updates.numPages = num_pages;
      if (storage_path !== undefined) updates.storagePath = storage_path;
      if (cover_path !== undefined) updates.coverPath = cover_path;

      await db
        .update(books)
        .set(updates)
        .where(and(eq(books.id, bookId), eq(books.clerkUserId, userId)));

      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      // Get the book first to find storage paths
      const book = await db
        .select()
        .from(books)
        .where(and(eq(books.id, bookId), eq(books.clerkUserId, userId)))
        .limit(1);

      if (book.length > 0) {
        // Delete PDF from R2
        try {
          await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: book[0].storagePath }));
        } catch (e) {
          console.error("Failed to delete PDF from R2:", e);
        }

        // Delete cover from R2 if exists
        if (book[0].coverPath) {
          try {
            await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: book[0].coverPath }));
          } catch (e) {
            console.error("Failed to delete cover from R2:", e);
          }
        }
      }

      // Delete the book row (cascades to annotations, canvas, chat, progress)
      await db
        .delete(books)
        .where(and(eq(books.id, bookId), eq(books.clerkUserId, userId)));

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
