import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth.js";
import { db } from "../_lib/db.js";
import { annotations } from "../_lib/schema.js";
import { eq, and, asc } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req.headers.authorization);
    const bookId = req.query.bookId as string;

    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(annotations)
        .where(and(eq(annotations.bookId, bookId), eq(annotations.clerkUserId, userId)))
        .orderBy(asc(annotations.createdAt));

      const result = rows.map((row) => {
        const annotation = row.data as Record<string, unknown>;
        return { ...annotation, id: row.id };
      });

      return res.status(200).json(result);
    }

    // PUT — full replace all annotations for a book
    if (req.method === "PUT") {
      const { annotations: annotationList } = req.body;

      // Delete all existing
      await db
        .delete(annotations)
        .where(and(eq(annotations.bookId, bookId), eq(annotations.clerkUserId, userId)));

      if (annotationList && annotationList.length > 0) {
        const rows = annotationList.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          bookId,
          clerkUserId: userId,
          type: a.type as string,
          data: a,
        }));

        await db.insert(annotations).values(rows);
      }

      return res.status(200).json({ ok: true });
    }

    // POST — upsert single annotation
    if (req.method === "POST") {
      const annotation = req.body;

      await db
        .insert(annotations)
        .values({
          id: annotation.id,
          bookId,
          clerkUserId: userId,
          type: annotation.type,
          data: annotation,
        })
        .onConflictDoUpdate({
          target: [annotations.id, annotations.bookId],
          set: {
            type: annotation.type,
            data: annotation,
          },
        });

      return res.status(200).json({ ok: true });
    }

    // DELETE — single annotation by query param
    if (req.method === "DELETE") {
      const annotationId = req.query.annotationId as string;

      await db
        .delete(annotations)
        .where(and(eq(annotations.id, annotationId), eq(annotations.clerkUserId, userId)));

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
