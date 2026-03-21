import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth.js";
import { db } from "../_lib/db.js";
import { books, readingProgress } from "../_lib/schema.js";
import { eq, desc } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req.headers.authorization);

    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(books)
        .leftJoin(readingProgress, eq(books.id, readingProgress.bookId))
        .where(eq(books.clerkUserId, userId))
        .orderBy(desc(books.updatedAt));

      const result = rows.map((row) => ({
        ...row.books,
        reading_progress: row.reading_progress ?? null,
      }));

      return res.status(200).json(result);
    }

    if (req.method === "POST") {
      const { id, title, author, filename, file_size, storage_path, cover_path, num_pages } = req.body;

      const values: Record<string, unknown> = {
        clerkUserId: userId,
        title,
        author: author ?? null,
        filename,
        fileSize: file_size,
        storagePath: storage_path,
        coverPath: cover_path ?? null,
        numPages: num_pages ?? null,
      };

      if (id) {
        values.id = id;
      }

      const result = await db.insert(books).values(values).returning();
      return res.status(201).json(result[0]);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
