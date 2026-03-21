import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth";
import { db } from "../_lib/db";
import { canvasContent } from "../_lib/schema";
import { eq, and } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req.headers.authorization);
    const bookId = req.query.bookId as string;

    if (req.method === "GET") {
      const result = await db
        .select()
        .from(canvasContent)
        .where(and(eq(canvasContent.bookId, bookId), eq(canvasContent.clerkUserId, userId)))
        .limit(1);

      return res.status(200).json({ content: result[0]?.content ?? "" });
    }

    if (req.method === "PUT") {
      const { content } = req.body;

      await db
        .insert(canvasContent)
        .values({ bookId, clerkUserId: userId, content })
        .onConflictDoUpdate({
          target: canvasContent.bookId,
          set: { content, updatedAt: new Date() },
        });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
