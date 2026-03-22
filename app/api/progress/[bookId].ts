import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth.js";
import { db } from "../_lib/db.js";
import { readingProgress } from "../_lib/schema.js";
import { parseBookId, parseBody, ProgressUpsertSchema } from "../_lib/validate.js";
import { eq, and } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req.headers.authorization);
    const bookId = parseBookId(req, res);
    if (!bookId) return;

    if (req.method === "GET") {
      const result = await db
        .select()
        .from(readingProgress)
        .where(and(eq(readingProgress.bookId, bookId), eq(readingProgress.clerkUserId, userId)))
        .limit(1);

      if (result.length === 0) return res.status(200).json(null);

      return res.status(200).json({
        currentPage: result[0].currentPage,
        furthestPage: result[0].furthestPage,
        lastPageRead: result[0].lastPageRead,
        scale: Number(result[0].scale),
      });
    }

    // PUT — upsert full progress
    if (req.method === "PUT") {
      const data = parseBody(ProgressUpsertSchema, req.body, res);
      if (!data) return;
      const { current_page, furthest_page, last_page_read, scale } = data;

      await db
        .insert(readingProgress)
        .values({
          bookId,
          clerkUserId: userId,
          currentPage: current_page ?? 1,
          furthestPage: furthest_page ?? 1,
          lastPageRead: last_page_read ?? 1,
          scale: String(scale ?? 1.5),
        })
        .onConflictDoUpdate({
          target: readingProgress.bookId,
          set: {
            currentPage: current_page ?? 1,
            furthestPage: furthest_page ?? 1,
            lastPageRead: last_page_read ?? 1,
            scale: String(scale ?? 1.5),
            updatedAt: new Date(),
          },
        });

      return res.status(200).json({ ok: true });
    }

    // PATCH — partial update
    if (req.method === "PATCH") {
      const data = parseBody(ProgressUpsertSchema, req.body, res);
      if (!data) return;
      const updates: Record<string, unknown> = {};

      if (data.current_page !== undefined) updates.currentPage = data.current_page;
      if (data.furthest_page !== undefined) updates.furthestPage = data.furthest_page;
      if (data.last_page_read !== undefined) updates.lastPageRead = data.last_page_read;
      if (data.scale !== undefined) updates.scale = String(data.scale);

      await db
        .update(readingProgress)
        .set(updates)
        .where(and(eq(readingProgress.bookId, bookId), eq(readingProgress.clerkUserId, userId)));

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
